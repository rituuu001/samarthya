import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import AuthShell from "@/auth/components/AuthShell";
import Field from "@/auth/components/Field";
import { interestOptions, suggestedSkills } from "@/auth/candidateOptions";
import type { CandidateProfileData } from "@/data/candidateVerification";

export default function CandidateOnboarding({
  fullName,
  email,
  onBack,
  onComplete,
}: {
  fullName: string;
  email: string;
  onBack: () => void;
  onComplete: (profile: CandidateProfileData) => Promise<void>;
}) {
  const [name, setName] = useState(fullName);
  const [skills, setSkills] = useState<string[]>(["React"]);
  const [skillInput, setSkillInput] = useState("");
  const [proficiency, setProficiency] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills((current) => [...current, trimmed]);
    setSkillInput("");
  };

  const onSkillKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill(skillInput);
    }
  };

  
const completeProfile = async (includeOnboardingDetails = true) => {
  try {
    await onComplete({
      fullName: name.trim(),
      email,
      headline: "",
      location: "",
      skills: includeOnboardingDetails ? skills : [],
      portfolioUrl: includeOnboardingDetails ? portfolio.trim() : "",
      introduction: includeOnboardingDetails ? introduction.trim() : "",
    });
  } catch (error) {
    setErrors((current) => ({
      ...current,
      server:
        error instanceof Error
          ? error.message
          : "Could not save your profile. Please try again.",
    }));
  }
};



  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Please enter your full name.";
    if (skills.length === 0) nextErrors.skills = "Add at least one current skill.";
    if (portfolio && !/^https?:\/\/.+/.test(portfolio)) {
      nextErrors.portfolio = "Add a full URL beginning with http:// or https://.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) await completeProfile();
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  return (
    <AuthShell
      role="candidate"
      step="onboarding"
      onBack={onBack}
      onSwitchRole={() => undefined}
    >
      <div className="onboarding-progress">
        <div>
          <span>Account created</span>
          <strong>Profile setup</strong>
        </div>
        <span>Step 2 of 2</span>
        <div className="progress-track"><span /></div>
      </div>

      <div className="onboarding-heading">
        <div className="auth-title">Let&apos;s Build Your Profile</div>
        <div className="auth-subtitle">
          Tell us what you can do. Your skills are your starting point.
        </div>
      </div>

      <form className="onboarding-card" onSubmit={submit} noValidate>
        <div className="onboarding-grid">
          <Field
            label="Full Name"
            name="candidate-profile-name"
            value={name}
            placeholder="Enter your full name"
            onChange={setName}
            error={errors.name}
          />

          <label className="auth-field">
            <span className="auth-label">Skill Proficiency <small>Optional</small></span>
            <select
              className="auth-input"
              value={proficiency}
              onChange={(event) => setProficiency(event.target.value)}
            >
              <option value="">Select a general level</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>

          <div className="auth-field onboarding-span">
            <span className="auth-label">Current Skills <b>*</b></span>
            <div className={errors.skills ? "tag-input tag-input-error" : "tag-input"}>
              {skills.map((skill) => (
                <span className="skill-tag" key={skill}>
                  {skill}
                  <button
                    type="button"
                    aria-label={`Remove ${skill}`}
                    onClick={() => setSkills((current) => current.filter((item) => item !== skill))}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={skillInput}
                placeholder="Type a skill and press Enter"
                onChange={(event) => setSkillInput(event.target.value)}
                onKeyDown={onSkillKeyDown}
                onBlur={() => addSkill(skillInput)}
              />
            </div>
            {errors.skills && <span className="auth-error">{errors.skills}</span>}
            <div className="suggested-skills">
              <span>Suggestions:</span>
              {suggestedSkills
                .filter((skill) => !skills.includes(skill))
                .slice(0, 5)
                .map((skill) => (
                  <button type="button" key={skill} onClick={() => addSkill(skill)}>
                    + {skill}
                  </button>
                ))}
            </div>
          </div>

          <div className="auth-field onboarding-span">
            <span className="auth-label">Areas of Interest <small>Optional</small></span>
            <div className="interest-grid">
              {interestOptions.map((interest) => (
                <button
                  type="button"
                  key={interest}
                  className={interests.includes(interest) ? "interest-active" : ""}
                  onClick={() => toggleInterest(interest)}
                >
                  <span>{interests.includes(interest) ? "✓" : "+"}</span>
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div className="onboarding-span">
            <Field
              label="GitHub / Portfolio URL"
              name="candidate-portfolio"
              value={portfolio}
              placeholder="https://github.com/your-name"
              onChange={setPortfolio}
              error={errors.portfolio}
              optional
              type="url"
            />
          </div>

          <label className="auth-field onboarding-span">
            <span className="auth-label">Short Introduction <small>Optional</small></span>
            <textarea
              className="auth-input auth-textarea"
              value={introduction}
              onChange={(event) => setIntroduction(event.target.value)}
              placeholder="What do you enjoy building or learning?"
              rows={3}
            />
          </label>
        </div>

        {errors.server && (<span className="auth-error">{errors.server}</span>)}
        
        <div className="philosophy-note">
          <span>i</span>
          You don&apos;t need an impressive resume to get started. Your work will speak for itself.
        </div>
        <div className="onboarding-actions">
          <button type="button" className="auth-secondary" onClick={() => completeProfile(false)}>
            Skip for Now
          </button>
          <button type="submit" className="auth-primary onboarding-primary">
            Complete Profile <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
