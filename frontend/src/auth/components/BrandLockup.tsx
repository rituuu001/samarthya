import samarthyaLogo from "@/imports/image.png";

export default function BrandLockup() {
  return (
    <div className="auth-brand">
      <img src={samarthyaLogo} alt="Samarthya logo" />
      <div>
        <div className="auth-brand-name">सामर्थ्य</div>
        <div className="auth-brand-motto">Prove First, Connect Later.</div>
      </div>
    </div>
  );
}
