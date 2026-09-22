import { Link } from 'react-router';

import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/surfaces';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      action={
        <Link to="/">
          <Button variant="secondary">Back to the home page</Button>
        </Link>
      }
    />
  );
}
