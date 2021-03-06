// @flow
import { SIMPLE_SITE } from 'config';
import * as PAGES from 'constants/pages';
import { CHANNEL_NEW } from 'constants/claim';
import React, { useEffect, useState } from 'react';
import classnames from 'classnames';
import { FormField, Form } from 'component/common/form';
import Button from 'component/button';
import ChannelSelection from 'component/selectChannel';
import usePersistedState from 'effects/use-persisted-state';
import { FF_MAX_CHARS_IN_COMMENT } from 'constants/form-field';
import { useHistory } from 'react-router';
import type { ElementRef } from 'react';

type Props = {
  uri: string,
  claim: StreamClaim,
  createComment: (string, string, string, ?string) => Promise<any>,
  channels: ?Array<ChannelClaim>,
  onDoneReplying?: () => void,
  onCancelReplying?: () => void,
  isNested: boolean,
  isFetchingChannels: boolean,
  parentId: string,
  isReply: boolean,
  isPostingComment: boolean,
};

export function CommentCreate(props: Props) {
  const {
    createComment,
    claim,
    channels,
    onDoneReplying,
    onCancelReplying,
    isNested,
    isFetchingChannels,
    isReply,
    parentId,
    isPostingComment,
  } = props;
  const buttonref: ElementRef<any> = React.useRef();
  const { push } = useHistory();
  const { claim_id: claimId } = claim;
  const [commentValue, setCommentValue] = React.useState('');
  const [channel, setChannel] = usePersistedState('comment-channel', '');
  const [charCount, setCharCount] = useState(commentValue.length);
  const [advancedEditor, setAdvancedEditor] = usePersistedState('comment-editor-mode', false);
  const hasChannels = channels && channels.length;
  const disabled = isPostingComment || channel === CHANNEL_NEW || !commentValue.length;
  const topChannel =
    channels &&
    channels.reduce((top, channel) => {
      const topClaimCount = (top && top.meta && top.meta.claims_in_channel) || 0;
      const currentClaimCount = (channel && channel.meta && channel.meta.claims_in_channel) || 0;
      return topClaimCount >= currentClaimCount ? top : channel;
    });

  useEffect(() => {
    // set default channel
    if ((channel === '' || channel === 'anonymous') && topChannel) {
      setChannel(topChannel.name);
    }
  }, [channel, topChannel, setChannel]);

  function handleCommentChange(event) {
    let commentValue;
    if (isReply) {
      commentValue = event.target.value;
    } else {
      commentValue = !SIMPLE_SITE && advancedEditor ? event : event.target.value;
    }

    setCommentValue(commentValue);
  }

  function altEnterListener(e: SyntheticKeyboardEvent<*>) {
    const KEYCODE_ENTER = 13;
    if ((e.ctrlKey || e.metaKey) && e.keyCode === KEYCODE_ENTER) {
      e.preventDefault();
      buttonref.current.click();
    }
  }

  function onTextareaFocus() {
    window.addEventListener('keydown', altEnterListener);
  }

  function onTextareaBlur() {
    window.removeEventListener('keydown', altEnterListener);
  }

  function handleSubmit() {
    if (channel !== CHANNEL_NEW && commentValue.length) {
      createComment(commentValue, claimId, channel, parentId).then(res => {
        if (res && res.signature) {
          setCommentValue('');

          if (onDoneReplying) {
            onDoneReplying();
          }
        }
      });
    }
  }

  function toggleEditorMode() {
    setAdvancedEditor(!advancedEditor);
  }

  useEffect(() => setCharCount(commentValue.length), [commentValue]);

  if (!hasChannels) {
    return (
      <div role="button" onClick={() => push(`/$/${PAGES.CHANNEL_NEW}`)}>
        <FormField
          type="textarea"
          name={'comment_signup_prompt'}
          placeholder={__('Say something about this...')}
          label={isFetchingChannels ? __('Comment') : undefined}
        />
        <div className="section__actions">
          <Button disabled button="primary" label={__('Post --[button to submit something]--')} requiresAuth={IS_WEB} />
        </div>
      </div>
    );
  }

  return (
    <Form
      onSubmit={handleSubmit}
      className={classnames('comment__create', {
        'comment__create--reply': isReply,
        'comment__create--nested-reply': isNested,
      })}
    >
      <FormField
        disabled={channel === CHANNEL_NEW}
        type={SIMPLE_SITE ? 'textarea' : advancedEditor && !isReply ? 'markdown' : 'textarea'}
        name={isReply ? 'content_reply' : 'content_description'}
        label={
          <span className="comment-new__label-wrapper">
            <div className="comment-new__label">{isReply ? __('Replying as') + ' ' : __('Comment as') + ' '}</div>
            <ChannelSelection channel={channel} hideAnon tiny hideNew onChannelChange={setChannel} />
          </span>
        }
        quickActionLabel={
          !SIMPLE_SITE && (isReply ? undefined : advancedEditor ? __('Simple Editor') : __('Advanced Editor'))
        }
        quickActionHandler={!SIMPLE_SITE && toggleEditorMode}
        onFocus={onTextareaFocus}
        onBlur={onTextareaBlur}
        placeholder={__('Say something about this...')}
        value={commentValue}
        charCount={charCount}
        onChange={handleCommentChange}
        autoFocus={isReply}
        textAreaMaxLength={FF_MAX_CHARS_IN_COMMENT}
      />
      <div className="section__actions section__actions--no-margin">
        <Button
          ref={buttonref}
          button="primary"
          disabled={disabled}
          type="submit"
          label={
            isReply
              ? isPostingComment
                ? __('Replying...')
                : __('Reply')
              : isPostingComment
              ? __('Posting...')
              : __('Post --[button to submit something]--')
          }
          requiresAuth={IS_WEB}
        />
        {isReply && (
          <Button
            button="link"
            label={__('Cancel')}
            onClick={() => {
              if (onCancelReplying) {
                onCancelReplying();
              }
            }}
          />
        )}
      </div>
    </Form>
  );
}
