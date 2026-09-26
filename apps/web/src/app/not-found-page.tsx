import { LinkButton } from '../components/ui/link-button';
import { EmptyState } from '../components/ui/surfaces';

export function NotFoundPage() {
  return (
    <EmptyState
      titleAs="h1"
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      action={
        <LinkButton to="/" variant="secondary">
          Back to the home page
        </LinkButton>
      }
    />
  );
}
