import Container from 'react-bootstrap/Container';
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useUser } from '../contexts/UserContext';
import { useFontInfo } from '../contexts/PreferencesContext';

export default function AboutPage() {
  const { controlledLog } = useControlledLog();
  const { isAdmin, gitInfo } = useUser();
  const { currentFontStyle } = useFontInfo();
  const gitMsg = isAdmin ? gitInfo : false;
  controlledLog('git info:' + gitInfo);

  return (
    <Container className="AboutPage mt-3">
      <div className={currentFontStyle}>
        <h1>About</h1>
        <p>
          For up-to-date instructions on this app, see&nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://docs.google.com/document/d/e/2PACX-1vTooKgBrn5p5NGoXrnf6eAoLMRZPJRTOaSRR-fb4lvv1aDAEFoI4u__2MMFoOwQuBf4mg8DUcAtwO5t/pub"
          >
            this page
          </a>
          .
        </p>
        {gitMsg && <p>{gitMsg}</p>}
      </div>
    </Container>
  );
}
