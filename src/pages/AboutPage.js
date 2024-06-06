import Container from 'react-bootstrap/Container';

export default function AboutPage() {
  return (
    <Container className="about-container">
      <p>
        <span className="font-size-1">About</span>
      </p>
      <p>
        For up-to-date instructions on this app, see&nbsp;
        <a
          target="_blank"
          rel="noreferrer"
          href="https://docs.google.com/document/d/1tSBt7gtLuLdjfH6e7hDI5RHKToUcZuszKltev2VcFZM/edit?usp=sharing"
        >
          this page
        </a>
        .
      </p>
    </Container>
  );
}
