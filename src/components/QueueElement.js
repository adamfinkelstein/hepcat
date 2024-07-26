import { useAppGlobals } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { useRef } from 'react';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import PaperConflict from './PaperConflict';
import { useFavorites } from '../contexts/PreferencesContext';

export default function QueueElement({ paper, showConflicts, showStars }) {
  const { user } = useUser();
  const globals = useAppGlobals();
  const favorites = useFavorites();
  const content = useRef(null);
  const queueIndex = paper ? paper.queue_order - 1 : -1;
  const isCurrent = queueIndex === globals.queueCurrent;
  const isPast = queueIndex < globals.queueCurrent;
  const isConflict = paper.nid === 0;
  const isFavorite = favorites.includes(paper.nid);
  const isScreenRole = user?.role_name === 'Screen';
  const isOutsideRole = user?.role_name === 'Outside';
  const isScreen = isScreenRole || isOutsideRole;
  const showStatus = paper.status && !isCurrent && !isScreen;
  const status = showStatus ? paper.status : '';
  const starSymbol = '\u2605';
  const confSymbol = '\u26D4';
  const possibleStar = isFavorite && showStars ? starSymbol : '';
  const suffixSym = isConflict ? confSymbol : possibleStar;
  const showTitle = isPast ? '' : paper.title;
  let qLine = ' (' + paper.nid + '): ' + status + showTitle;

  if (isScreen) qLine = '';
  else if (isConflict) qLine = ': CONFLICTED!';

  // ??? AF cut this from below: `${content.current.scrollHeight}px`

  return (
    <Container className="queue-element-container">
      <Stack direction="horizontal">
        <span className="queue-title font-size-4">
          Q{paper.queue_order}
          {qLine}
        </span>
        <div className="qSymbol">{suffixSym}</div>
      </Stack>
      {!isPast && (
        <div
          ref={content}
          style={
            // this next line was broken so AF comment it out:
            {
              // maxHeight: `${(showConflicts === false || content === null) ? "0" : (content.current.scrollHeight )}px`
              maxHeight: `${
                showConflicts === false || content === null ? '0' : '100'
              }px`,
            }
          }
          className="queue-conflicts"
        >
          <div>
            {!isConflict && (
              <PaperConflict
                conflicts={paper.conflicts}
                isCurrent={isCurrent}
              />
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
