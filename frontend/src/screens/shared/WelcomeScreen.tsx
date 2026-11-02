import samarthyaLogo from "@/imports/image.png";
import type { InfoPageKey } from "@/PublicInfo";

export function CandidateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.75 19c.35-3.45 2.55-5.25 6.25-5.25s5.9 1.8 6.25 5.25" />
      <path d="m17.25 5.25.6 1.2 1.4.2-1 1 .25 1.4-1.25-.65-1.25.65.25-1.4-1-1 1.4-.2.6-1.2Z" />
    </svg>
  );
}

function EmployerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="7.25" width="17" height="12.25" rx="2" />
      <path d="M8.5 7.25V5.5c0-.55.45-1 1-1h5c.55 0 1 .45 1 1v1.75M3.5 12.25c4.85 2.35 12.15 2.35 17 0M10 12.75h4" />
    </svg>
  );
}

function PlatformIllustration() {
  return (
    <div className="welcome-illustration" aria-label="Candidates and employers connect through verified work">
      <div className="illustration-card illustration-card-candidate">
        <div className="illustration-card-top">
          <div className="illustration-avatar">
            <CandidateIcon />
          </div>
          <div>
            <div className="illustration-label">Candidate</div>
            <div className="illustration-title">Proof in progress</div>
          </div>
        </div>
        <div className="illustration-task">
          <div className="illustration-task-row">
            <span>API integration project</span>
            <strong>86%</strong>
          </div>
          <div className="illustration-progress">
            <span />
          </div>
        </div>
        <div className="illustration-skills">
          <span>React</span>
          <span>API</span>
          <span>TypeScript</span>
        </div>
      </div>

      <div className="illustration-connector" aria-hidden="true">
        <span />
        <div>✓</div>
        <span />
      </div>

      <div className="illustration-card illustration-card-employer">
        <div className="illustration-card-top">
          <div className="illustration-avatar">
            <EmployerIcon />
          </div>
          <div>
            <div className="illustration-label">Employer</div>
            <div className="illustration-title">Skills verified</div>
          </div>
        </div>
        <div className="illustration-score">
          <div>
            <span>Blind evaluation</span>
            <strong>8.6</strong>
          </div>
          <div className="score-bars">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="illustration-match">
          <span>Demonstrated ability</span>
          <strong>Strong match</strong>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  type,
  title,
  description,
  buttonLabel,
  onContinue,
}: {
  type: "candidate" | "employer";
  title: string;
  description: string;
  buttonLabel: string;
  onContinue: () => void;
}) {
  return (
    <div className="role-card">
      <div className="role-icon">
        {type === "candidate" ? <CandidateIcon /> : <EmployerIcon />}
      </div>
      <div className="role-card-title">{title}</div>
      <div className="role-card-description">{description}</div>
      <button className="role-button" onClick={onContinue}>
        <span>{buttonLabel}</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

export function WelcomeScreen({
  onCandidate,
  onEmployer,
  onNavigate,
}: {
  onCandidate: () => void;
  onEmployer: () => void;
  onNavigate: (page: InfoPageKey) => void;
}) {
  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-header-inner">
          <div className="welcome-brand">
            <img src={samarthyaLogo} alt="Samarthya logo" />
            <div>
              <div className="welcome-brand-name">सामर्थ्य</div>
              <div className="welcome-motto">Prove First, Connect Later.</div>
            </div>
          </div>
          <nav className="welcome-nav" aria-label="Main navigation">
            <button type="button" onClick={() => onNavigate("how")}>How It Works</button>
            <button type="button" onClick={() => onNavigate("about")}>About Us</button>
            <button type="button" onClick={() => onNavigate("help")}>Help / FAQ</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="welcome-hero">
          <div className="welcome-hero-copy">
            <div className="welcome-eyebrow">
              <span />
              Proof-of-work hiring
            </div>
            <div className="welcome-heading">
              Welcome to <span>सामर्थ्य</span>
            </div>
            <div className="welcome-headline">
              Opportunities built on skills,
              <br />
              not just resumes.
            </div>
            <div className="welcome-description">
              A platform where talent meets opportunity through real work, verified skills,
              and fair evaluation. Whether you&apos;re looking to showcase your abilities or
              find the right talent, your journey starts here.
            </div>
          </div>
          <PlatformIllustration />
        </section>

        <section className="role-section" id="how-it-works">
          <div className="role-section-heading">
            <div>
              <div className="role-kicker">Start your journey</div>
              <div className="role-heading">How would you like to continue?</div>
            </div>
            <div className="role-subtitle">Choose your role to get started.</div>
          </div>
          <div className="role-grid">
            <RoleCard
              type="candidate"
              title="I'm a Candidate"
              description="Showcase your skills, complete real-world projects, build your journey, and get recognized for what you can do."
              buttonLabel="Continue as Candidate"
              onContinue={onCandidate}
            />
            <RoleCard
              type="employer"
              title="I'm an Employer"
              description="Post paid micro-tasks, discover skilled contributors through blind evaluation, and hire based on demonstrated ability."
              buttonLabel="Continue as Employer"
              onContinue={onEmployer}
            />
          </div>
        </section>
      </main>

      <footer className="welcome-footer" id="about">
        <div className="welcome-footer-inner">
          <div className="footer-motto">Prove First, Connect Later.</div>
          <div className="footer-links" id="help">
            <button type="button" onClick={() => onNavigate("about")}>About</button>
            <button type="button" onClick={() => onNavigate("contact")}>Contact Us</button>
            <button type="button" onClick={() => onNavigate("privacy")}>Privacy Policy</button>
          </div>
          <div className="footer-copyright">© 2026 सामर्थ्य.</div>
        </div>
      </footer>
    </div>
  );
}
