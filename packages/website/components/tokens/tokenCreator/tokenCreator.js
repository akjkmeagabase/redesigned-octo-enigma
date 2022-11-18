import clsx from 'clsx';
import { useRouter } from 'next/router';
import { useCallback, useLayoutEffect, useRef } from 'react';

import countly from 'lib/countly';
import Button, { ButtonVariant } from 'components/button/button';
import { useTokens } from 'components/contexts/tokensContext';

const TokenCreator = () => {
  const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  const { query, push } = useRouter();
  const { tokens, createToken, isCreating, getTokens } = useTokens();

  const onTokenCreate = useCallback(
    async e => {
      // Tracking
      countly.trackEvent(
        countly.events.TOKEN_CREATE,
        !tokens.length
          ? {
              ui: countly.ui.TOKENS_EMPTY,
              action: 'New API Token',
            }
          : {
              ui: countly.ui.NEW_TOKEN,
              action: 'Create new token',
            }
      );

      e.preventDefault();

      if (!!inputRef.current?.value) {
        await createToken(inputRef.current?.value);
        await getTokens();
        push('/tokens');
      }
    },
    [push, tokens, getTokens, createToken]
  );

  useLayoutEffect(() => {
    if (!!query.create && !isCreating) {
      inputRef.current?.focus();
    }
  }, [query.create, isCreating]);

  return (
    <div className={clsx('token-creator-container', isCreating && 'isDisabled')}>
      {isCreating ? (
        'Creating...'
      ) : (
        <>
          <form className={clsx(!query.create && 'hidden', 'token-creator-input-container')} onSubmit={onTokenCreate}>
            <input ref={inputRef} required className="token-creator-input" placeholder="Name your token" />
            <button className="token-creator-submit">+</button>
          </form>
          <Button
            className={clsx('token-creator-create', query.create && 'hidden')}
            href="/account"
            onClick={() => push('/tokens?create=true')}
            variant={ButtonVariant.TEXT}
          >
            + Create a new API Token
          </Button>
        </>
      )}
    </div>
  );
};

export default TokenCreator;
