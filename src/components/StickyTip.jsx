import HoverTip from './HoverTip';

export default function StickyTip() {
  return (
    <HoverTip
      label="How to use this?"
      header="Sticky Usage"
      className="StickyTip"
    >
      <div>
        Signal the Chair that a paper is ready for public discussion:
        <ul>
          <li>
            <strong>Tabled-Discuss</strong> &mdash; Either:
            <ol>
              <li>Primary wants help/advice from the PC, or</li>
              <li>A PC member wants to revisit a paper discussion.</li>
            </ol>
          </li>
          <li>
            <strong>Reject, Conference</strong> or
            <strong> Journal:</strong>
            <ul>
              <li>Paper has converged.</li>
              <li>Usually filed by Primary.</li>
            </ul>
          </li>
        </ul>
      </div>
    </HoverTip>
  );
}
