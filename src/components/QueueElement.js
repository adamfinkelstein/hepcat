import { useAppGlobals } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import PaperConflict from './PaperConflict';
import { useFavorites } from '../contexts/PreferencesContext';

export default function QueueElement({ paper, showConflicts, showStars }) {
  const { user } = useUser();
  const globals = useAppGlobals();
  const favorites = useFavorites();
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
  const nid = paper.nid;
  const prefix = nid ? `Q${paper.queue_order} (${nid}):` : '';
  const title = isPast ? status : paper.title;
  const showTitle = isConflict ? 'CONFLICT' : title;
  const qEntryClass = isConflict ? 'font-size-3 mx-auto' : 'font-size-4';

  return (
    <Container className="QueueElement">
      <Stack direction="horizontal">
        <div className={qEntryClass}>
          <span className="q-title">{prefix}&nbsp;</span>
          {showTitle}
        </div>
        <div className="q-symbol">{suffixSym}</div>
      </Stack>
      {!isPast && (
        <div>
          {showConflicts && !isConflict && (
            <PaperConflict conflicts={paper.conflicts} isCurrent={isCurrent} />
          )}
        </div>
      )}
    </Container>
  );
}
