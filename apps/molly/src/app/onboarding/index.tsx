import { ConnectForm } from '@/features/onboarding/ConnectForm';
import { KeyRejected } from '@/features/onboarding/KeyRejected';
import { useSession } from '@/session/session';

export default function OnboardingStart() {
  const { state } = useSession();
  return state.status === 'keyRejected' ? <KeyRejected /> : <ConnectForm />;
}
