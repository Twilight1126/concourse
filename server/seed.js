// Demo data (dates are relative to today). Safe to delete via Settings → "Clear all data".
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fwd = (n) => ago(-n);

export function seedDemo(db, run) {
  const A = (v) => run({ table: 'applications', op: 'insert', values: v })[0];
  const H = (id, from, to, days) => run({ table: 'status_history', op: 'insert', values: { application_id: id, from_status: from, to_status: to, changed_at: new Date(Date.now() - days * 864e5).toISOString() } });
  const C = (id, v) => run({ table: 'cold_emails', op: 'insert', values: { application_id: id, ...v } });

  const rows = [
    [{ company: 'Razorpay', role: 'Full Stack Engineer', location: 'Bengaluru', salary_range: '₹18–26 LPA', source: 'linkedin', status: 'interview', applied_on: ago(18), follow_up_on: fwd(2), last_activity_on: ago(2), contact_name: 'Ananya Rao', contact_role: 'Engineering Manager', job_url: 'https://razorpay.com/jobs/demo-1' }, 18],
    [{ company: 'Zerodha', role: 'Backend Developer (Node.js)', location: 'Bengaluru', source: 'portal', status: 'screening', applied_on: ago(9), follow_up_on: ago(1), last_activity_on: ago(5), job_url: 'https://zerodha.com/careers/demo-2' }, 9],
    [{ company: 'Swiggy', role: 'SDE-2', location: 'Bengaluru', salary_range: '₹22–30 LPA', source: 'referral', status: 'applied', applied_on: ago(6), follow_up_on: fwd(1), last_activity_on: ago(6), contact_name: 'Rohit Kumar', contact_role: 'Senior Engineer' }, 6],
    [{ company: 'Postman', role: 'Software Engineer', location: 'Bengaluru (Hybrid)', source: 'linkedin', status: 'applied', applied_on: ago(16), follow_up_on: ago(9), last_activity_on: ago(16), job_url: 'https://postman.com/careers/demo-4' }, 16],
    [{ company: 'Freshworks', role: 'Angular Developer', location: 'Chennai / Remote', source: 'portal', status: 'rejected', applied_on: ago(25), last_activity_on: ago(10) }, 25],
    [{ company: 'Atlassian', role: 'Full Stack Engineer', location: 'Bengaluru', source: 'cold_email', status: 'wishlist', last_activity_on: ago(1), contact_name: 'Meera Nair', contact_role: 'Tech Recruiter', contact_email: 'meera@example.com' }, 1],
    [{ company: 'Cred', role: 'Backend Engineer', location: 'Bengaluru', source: 'linkedin', status: 'offer', applied_on: ago(30), follow_up_on: fwd(3), last_activity_on: ago(1) }, 30],
  ];
  const ids = rows.map(([v, d]) => {
    const a = A(v);
    H(a.id, null, v.status === 'wishlist' ? 'wishlist' : 'applied', d);
    if (!['wishlist', 'applied'].includes(v.status)) H(a.id, 'applied', v.status, Math.max(1, d - 8));
    return a.id;
  });
  C(ids[0], { channel: 'linkedin', sent_on: ago(17), contact_name: 'Ananya Rao', contact_role: 'Engineering Manager', replied: true, replied_on: ago(15), converted_to_interview: true });
  C(ids[2], { channel: 'email', sent_on: ago(6), contact_name: 'Rohit Kumar', contact_role: 'Senior Engineer', follow_up_count: 1 });
  C(ids[3], { channel: 'linkedin', sent_on: ago(15), contact_name: 'Hiring Team', follow_up_count: 2 });
  C(ids[5], { channel: 'email', sent_on: ago(1), contact_name: 'Meera Nair', contact_role: 'Tech Recruiter' });
  db.prepare("INSERT INTO settings (key,value) VALUES ('seeded','1') ON CONFLICT(key) DO UPDATE SET value='1'").run();
}
