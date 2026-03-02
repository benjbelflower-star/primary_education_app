import { Invoice, Tutor } from "../types";

export default function ClassWalletSummary({ invoice, tutor }: { invoice: Invoice; tutor: Tutor | null }) {
  const vendor = invoice.vendor_name ?? "School";

  const tutorName = tutor?.full_name ?? invoice.tutor_name ?? "N/A";
  const tutorEmail = tutor?.email ?? "N/A";
  const tutorPhone = tutor?.phone ?? "N/A";
  const credType = tutor?.credential_type ?? invoice.tutor_credential_type ?? "N/A";
  const field = tutor?.field_of_study ?? invoice.tutor_field_of_study ?? "N/A";
  const credUrl = tutor?.credential_url ?? invoice.tutor_credential_url ?? "N/A";

  const contactString = [tutorEmail, tutorPhone].filter(c => c !== "N/A").join(" | ") || "N/A";

  return (
    <div id="print-area" style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 4 }}>{vendor}</h1>
      <div style={{ opacity: 0.8, marginBottom: 18 }}>ClassWallet Ready Summary (Tutoring)</div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, gap: 20 }}>
        <div>
          <div><strong>Invoice #:</strong> {invoice.invoice_number}</div>
          <div><strong>Issue Date:</strong> {invoice.issue_date}</div>
          <div><strong>Status:</strong> {invoice.status}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div><strong>Bill To:</strong> {invoice.bill_to_name ?? "N/A"}</div>
          <div>
            <strong>Student:</strong> {invoice.student_display_name ?? "N/A"}
            {invoice.student_grade_level ? ` (Grade ${invoice.student_grade_level})` : ""}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #ddd", paddingTop: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>ClassWallet Entry Fields (copy in this order)</div>
        <div style={{ display: "grid", gap: 8, fontSize: 16 }}>
          <div><strong>Categorize Expense:</strong> Tutoring Services</div>
          <div><strong>Transaction Date:</strong> {invoice.transaction_date ?? "N/A"}</div>
          <div><strong>Transaction Method:</strong> {invoice.transaction_method ?? "N/A"}</div>
          <div><strong>Vendor / Facility:</strong> {vendor}</div>
          <div><strong>Merchant Name:</strong> {invoice.merchant_name ?? "N/A"}</div>
          <div><strong>Transaction Total:</strong> ${invoice.total}</div>
          <div><strong>Tutor Name:</strong> {tutorName}</div>
          <div><strong>Tutor Contact:</strong> {contactString}</div>
          <div><strong>Tutor Credential Type:</strong> {credType}</div>
          <div><strong>Credential Field of Study:</strong> {field}</div>
          <div>
            <strong>Tutor Credential Document:</strong>{" "}
            {credUrl !== "N/A" ? <a href={credUrl} target="_blank" rel="noreferrer">Open</a> : "N/A"}
          </div>
          <div><strong>Tutoring Subject:</strong> {invoice.tutoring_subject ?? "N/A"}</div>
        </div>
      </div>
    </div>
  );
}