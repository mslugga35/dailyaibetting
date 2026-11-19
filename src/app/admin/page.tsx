import { redirect } from 'next/navigation';

/** /admin has one tool. The grading page does its own admin check (non-admins get a 404). */
export default function AdminIndex() {
  redirect('/admin/grading');
}
