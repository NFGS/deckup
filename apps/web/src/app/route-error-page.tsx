import { isRouteErrorResponse, useRouteError } from 'react-router';

import { LinkButton } from '../components/ui/link-button';
import { EmptyState } from '../components/ui/surfaces';

export function RouteErrorPage() {
  const error = useRouteError();
  const description = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : 'Something went wrong while rendering this page.';

  return (
    <EmptyState
      titleAs="h1"
      title="Unexpected error"
      description={description}
      action={
        <LinkButton to="/" variant="secondary">
          Back to the home page
        </LinkButton>
      }
    />
  );
}
