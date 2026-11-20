import { redirect } from 'next/navigation';

/** /admin has one tool. The grading page does its own admin check (non-admins see a no-access page). */
export default function AdminIndex() {
  redirect('/admin/grading');
}
