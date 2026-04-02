import ContactManager from "@/components/admin/contact-manager";
import { getContacts } from "@/lib/firebase/portfolio";

export default async function DashboardContactsPage() {
  const contacts = await getContacts();

  return <ContactManager initialContacts={contacts} />;
}
