import samarthyaLogo from "@/imports/image.webp";

export type InfoPageKey = "how" | "about" | "help" | "privacy" | "contact" | "terms" | "forgot";

const pageContent: Record<
  Exclude<InfoPageKey, "forgot">,
  { eyebrow: string; title: string; intro: string; sections: { title: string; text: string }[] }
> = {
  how: {
    eyebrow: "How it works",
    title: "Hiring that starts with demonstrated ability.",
    intro:
      "सामर्थ्य replaces resume-first screening with paid projects, blind evaluation, and verified skills.",
    sections: [
      { title: "1. Choose your path", text: "Candidates build their journey. Employers create focused, paid projects tied to real work." },
      { title: "2. Prove through work", text: "Candidates apply to relevant projects and submit practical work without exposing identity during evaluation." },
      { title: "3. Evaluate fairly", text: "Employers score the work against consistent criteria before learning who completed it." },
      { title: "4. Connect by choice", text: "After approval and payment release, employers can request a connection and candidates decide whether to reveal their identity." },
    ],
  },
  about: {
    eyebrow: "About us",
    title: "Opportunity should follow ability.",
    intro:
      "सामर्थ्य is a skills-first hiring platform designed to make access to opportunity more practical, fair, and accountable.",
    sections: [
      { title: "Our purpose", text: "We help capable people demonstrate what they can do, even when they lack traditional credentials or professional networks." },
      { title: "Our approach", text: "Paid micro-tasks, protected identities, verified work, and transparent payments create a more trustworthy hiring process." },
      { title: "Our promise", text: "We will keep skills, consent, fair evaluation, and contributor dignity at the center of the platform." },
    ],
  },
  help: {
    eyebrow: "Help / FAQ",
    title: "Answers for getting started.",
    intro: "Quick guidance for candidates and employers using the सामर्थ्य proof-of-work marketplace.",
    sections: [
      { title: "Do candidates need a CV?", text: "No. Candidates begin with skills and interests, then build a verified journey through completed work." },
      { title: "Are projects paid?", text: "Yes. Employers lock the listed amount before publishing a project, and payment is released after approval." },
      { title: "When is a candidate's identity visible?", text: "Identity remains hidden during evaluation. Candidates can choose whether to reveal it after a connection request." },
      { title: "Can organizations verify later?", text: "Yes. Verification improves trust but does not block initial account creation or profile setup." },
    ],
  },
  privacy: {
    eyebrow: "Privacy policy",
    title: "Your information, handled with purpose.",
    intro: "This prototype policy explains the privacy principles that guide the सामर्थ्य experience.",
    sections: [
      { title: "Information we collect", text: "We collect account, profile, application, project, submission, and payment-status information needed to operate the platform." },
      { title: "Blind evaluation", text: "Candidate names and identifying profile details are withheld from employers during the evaluation stage." },
      { title: "Identity sharing", text: "Candidate identity is shared with an employer only after the candidate actively approves a connection request." },
      { title: "Your choices", text: "Users can update profile information, decline identity reveal, and contact support regarding access or correction requests." },
    ],
  },
  contact: {
    eyebrow: "Contact us",
    title: "We're here to help.",
    intro: "Reach the सामर्थ्य team for product support, employer verification, partnerships, or accessibility assistance.",
    sections: [
      { title: "General support", text: "support@samarthya.example · Responses within two business days." },
      { title: "Employer verification", text: "verification@samarthya.example · Include your organization name and official website." },
      { title: "Partnerships", text: "partners@samarthya.example · For training providers, communities, and hiring partners." },
    ],
  },
  terms: {
    eyebrow: "Terms & Conditions",
    title: "Clear expectations for a fair marketplace.",
    intro: "By using सामर्थ्य, users agree to act honestly, protect confidential work, and respect the platform's skills-first process.",
    sections: [
      { title: "Candidate responsibilities", text: "Submit original work, represent skills accurately, and keep project materials confidential where requested." },
      { title: "Employer responsibilities", text: "Publish legitimate paid tasks, evaluate submitted work fairly, and release approved payments promptly." },
      { title: "Marketplace conduct", text: "Harassment, discrimination, identity circumvention, unpaid speculative work, and misuse of submissions are not permitted." },
      { title: "Prototype notice", text: "This interface is a product prototype. Final legal terms will be provided before public launch." },
    ],
  },
};

export default function PublicInfo({
  page,
  onBack,
}: {
  page: InfoPageKey;
  onBack: () => void;
}) {
  if (page === "forgot") {
    return <ForgotPassword onBack={onBack} />;
  }

  const content = pageContent[page];
  return (
    <div className="info-page">
      <header className="info-header">
        <button className="info-brand" type="button" onClick={onBack}>
          <img src={samarthyaLogo} alt="Samarthya logo" />
          <span>
            <strong>सामर्थ्य</strong>
            <small>Prove First, Connect Later.</small>
          </span>
        </button>
        <button className="info-back" type="button" onClick={onBack}>← Back</button>
      </header>
      <main className="info-main">
        <div className="info-eyebrow">{content.eyebrow}</div>
        <div className="info-title">{content.title}</div>
        <div className="info-intro">{content.intro}</div>
        <div className="info-sections">
          {content.sections.map((section) => (
            <section key={section.title}>
              <div>{section.title}</div>
              <p>{section.text}</p>
            </section>
          ))}
        </div>
      </main>
      <footer className="info-footer">© 2026 सामर्थ्य · Prove First, Connect Later.</footer>
    </div>
  );
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  return (
    <div className="info-page forgot-page">
      <header className="info-header">
        <div className="info-brand">
          <img src={samarthyaLogo} alt="Samarthya logo" />
          <span><strong>सामर्थ्य</strong><small>Prove First, Connect Later.</small></span>
        </div>
        <button className="info-back" type="button" onClick={onBack}>← Back to login</button>
      </header>
      <main className="forgot-main">
        <div className="forgot-card">
          <div className="info-eyebrow">Account recovery</div>
          <div className="forgot-title">Reset your password</div>
          <p>Enter your account email and we'll send you a secure reset link.</p>
          <label>
            <span>Email Address</span>
            <input type="email" placeholder="you@example.com" />
          </label>
          <button type="button" onClick={onBack}>Send Reset Link <span>→</span></button>
          <small>For this prototype, the button returns you to login.</small>
        </div>
      </main>
    </div>
  );
}
