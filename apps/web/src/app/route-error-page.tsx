import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/surfaces';

export function RouteErrorPage() {
  const error = useRouteError();
  const description = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : 'Something went wrong while rendering this page.';

  return (
    <EmptyState
      title="Unexpected error"
      description={description}
      action={
        <Link to="/">
          <Button variant="secondary">Back to the home page</Button>
        </Link>
      }
    />
  );
}
