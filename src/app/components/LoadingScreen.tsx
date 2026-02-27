import "../../styles/components/LoadingScreen.css";

type LoadingScreenProps = {
  title?: string;
  message?: string;
};

export function LoadingScreen({
  title = "Loading",
  message = "Please wait while we prepare your data.",
}: LoadingScreenProps) {
  return (
    <div className="ls-page" role="status" aria-live="polite" aria-busy="true">
      <div className="ls-card">
        <div className="ls-spinner" aria-hidden="true">
          <span className="ls-spinner-dot ls-spinner-dot-1" />
          <span className="ls-spinner-dot ls-spinner-dot-2" />
          <span className="ls-spinner-dot ls-spinner-dot-3" />
        </div>
        <h2 className="ls-title">{title}</h2>
        <p className="ls-message">{message}</p>
        <div className="ls-progress" aria-hidden="true">
          <span className="ls-progress-fill" />
        </div>
      </div>
    </div>
  );
}
