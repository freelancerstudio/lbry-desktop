// @flow
import React from 'react';
import Button from 'component/button';
import { getSavedPassword } from 'util/saved-passwords';
import Card from 'component/common/card';
import { withRouter } from 'react-router';
import Spinner from 'component/spinner';
import { Lbry } from 'lbry-redux';
import ErrorText from 'component/common/error-text';

type Props = {
  setSyncEnabled: boolean => void,
  syncEnabled: boolean,
  getSyncError: ?string,
  getSyncPending: boolean,
  getSync: (pw: string, cb: () => void) => void,
  checkSync: () => void,
  closeModal: () => void,
  mode: string,
};

const ENABLE_MODE = 'enable';

// steps
const FETCH_FOR_ENABLE = 'fetch-for-enable';
const FETCH_FOR_DISABLE = 'fetch-for-disable';
const CONFIRM = 'confirm';
const INITIAL = 'initial';
const ERROR = 'error';

const SHARED_KEY = 'shared';
const LOCAL_KEY = 'local';

function SyncEnableFlow(props: Props) {
  const { setSyncEnabled, getSyncError, getSyncPending, getSync, checkSync, mode, closeModal } = props;

  const [step, setStep] = React.useState(INITIAL);
  const [prefDict, setPrefDict]: [any, (any) => void] = React.useState();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState();

  const handleSyncToggle = async () => {
    const shared = prefDict.shared;
    const local = prefDict.local;
    let finalPrefs;
    if (shared && local) {
      if (mode === ENABLE_MODE) {
        finalPrefs = makeMergedPrefs(local, shared);
      } else {
        finalPrefs = makeMergedPrefs(shared, local);
      }
    } else {
      finalPrefs = local || shared || null;
    }

    // set busy (disable button)
    if (finalPrefs) {
      await Lbry.preference_set({ key: mode === ENABLE_MODE ? SHARED_KEY : LOCAL_KEY, value: finalPrefs });
    }
    await setSyncEnabled(mode === ENABLE_MODE);
    closeModal();
  };

  const makeMergedPrefs = (from, to) => {
    const mergedTo = to;
    const toPrefs = to.value;
    const fromPrefs = from.value;
    if (!fromPrefs) {
      return to;
    }

    const mergedBlockListSet = new Set(toPrefs.blocked || []);
    const mergedSubscriptionsSet = new Set(toPrefs.subscriptions || []);
    const mergedTagsSet = new Set(toPrefs.tags || []);

    const fromBlocklist = fromPrefs.blocked || [];
    const fromSubscriptions = fromPrefs.subscriptions || [];
    const fromTags = fromPrefs.tags || [];

    if (fromBlocklist.length) {
      fromBlocklist.forEach(el => mergedBlockListSet.add(el));
    }
    if (fromSubscriptions.length) {
      fromSubscriptions.forEach(el => mergedSubscriptionsSet.add(el));
    }
    if (fromTags.length) {
      fromTags.forEach(el => mergedTagsSet.add(el));
    }

    toPrefs.blocked = Array.from(mergedBlockListSet);
    toPrefs.subscriptions = Array.from(mergedSubscriptionsSet);
    toPrefs.tags = Array.from(mergedTagsSet);
    mergedTo.value = toPrefs;
    return mergedTo;
  };

  React.useEffect(() => {
    if (mode) {
      checkSync();
      if (mode === ENABLE_MODE) {
        setStep(FETCH_FOR_ENABLE);
      } else {
        setStep(FETCH_FOR_DISABLE);
      }
    }
  }, [mode]);

  React.useEffect(() => {
    getSavedPassword()
      .then(pw => setPassword(pw || ''))
      .catch(e => {
        setError(e && e.message ? e.message : e);
      });
  }, []);

  React.useEffect(() => {
    if (step === FETCH_FOR_ENABLE) {
      getSync(password, (e, hasChanged) => {
        if (e) {
          setStep(ERROR);
          setError(e && e.message ? e.message : e);
        } else {
          Lbry.preference_get().then(result => {
            const prefs = {};
            if (result[SHARED_KEY]) prefs[SHARED_KEY] = result[SHARED_KEY];
            if (result[LOCAL_KEY]) prefs[LOCAL_KEY] = result[LOCAL_KEY];
            setPrefDict(prefs);
            setStep(CONFIRM);
          });
        }
      });
    }
    if (step === FETCH_FOR_DISABLE) {
      Lbry.preference_get().then(result => {
        const prefs = {};
        if (result[SHARED_KEY]) prefs[SHARED_KEY] = result[SHARED_KEY];
        if (result[LOCAL_KEY]) prefs[LOCAL_KEY] = result[LOCAL_KEY];
        setPrefDict(prefs);
        setStep(CONFIRM);
      });
    }
  }, [step, setPrefDict, setStep, password]);

  if (getSyncPending) {
    return (
      <div>
        <Spinner />
      </div>
    );
  }

  return (
    <Card
      title={mode === ENABLE_MODE ? 'Enable Sync' : 'Disable Sync'}
      body={
        <div>
          {step === INITIAL && (
            <>
              <h1>{__(`Please wait...`)}</h1>
              <Spinner />
            </>
          )}
          {(step === FETCH_FOR_ENABLE || step === FETCH_FOR_DISABLE) && (
            <>
              <h1>{__(`Getting your profiles...`)}</h1>
              <Spinner />
            </>
          )}
          {step === CONFIRM && mode === ENABLE_MODE && (
            <>
              <h1>{__(`Enabling sync will switch to your cloud profile.`)}</h1>
            </>
          )}
          {step === CONFIRM && mode !== ENABLE_MODE && (
            <>
              <h1>{__(`Disabling sync will switch to your local profile.`)}</h1>
            </>
          )}
          {(error || getSyncError) && (
            <>
              <h1>{__(`Something went wrong...`)}</h1>
              <ErrorText>{error || (getSyncError && String(getSyncError)) || __('Unknown error')}</ErrorText>
            </>
          )}
        </div>
      }
      actions={
        <>
          {step === CONFIRM && (
            <div className={'card__actions'}>
              <Button
                button="primary"
                name={'syncbutton'}
                label={mode === ENABLE_MODE ? __('Enable Sync') : __('Disable Sync')}
                onClick={() => handleSyncToggle()}
              />
              <Button button="link" name={'cancel'} label={__('Cancel')} onClick={() => closeModal()} />
            </div>
          )}
          {(step === FETCH_FOR_ENABLE || step === FETCH_FOR_DISABLE) && (
            <div className={'card__actions'}>
              <Button
                button="primary"
                name={'syncbutton'}
                label={mode === ENABLE_MODE ? __('Enable Sync') : __('Disable Sync')}
                onClick={() => handleSyncToggle()}
                disabled
              />
              <Button button="link" name={'cancel'} label={__('Cancel')} onClick={() => closeModal()} />
            </div>
          )}
          {(error || getSyncError) && (
            <div className={'card__actions'}>
              <Button button="primary" name={'cancel'} label={__('Close')} onClick={() => closeModal()} />
            </div>
          )}
        </>
      }
    />
  );
}

export default withRouter(SyncEnableFlow);