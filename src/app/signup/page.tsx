import { redirect } from 'next/navigation';

/** /signup is the sign-in form in sign-up mode (email link creates the free account). */
export default function SignupPage() {
  redirect('/login?mode=signup');
}
