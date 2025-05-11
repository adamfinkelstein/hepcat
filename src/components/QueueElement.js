import { useAppGlobals } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import PaperConflict from './PaperConflict';
import { usePreferences } from '../contexts/PreferencesContext';

export default function QueueElement({ paper }) {
  const { isScreenOrOutside } = useUser();
  const globals = useAppGlobals();
  const { favorites, showConflicts, showStars } = usePreferences();
  const queueIndex = paper ? paper.queue_order - 1 : -1;
  const isCurrent = queueIndex === globals.queueCurrent;
  const isPast = queueIndex < globals.queueCurrent;
  const isConflict = paper.nid === 0;
  const isFavorite = favorites.includes(paper.nid);
  const isScreen = isScreenOrOutside();
  const showStatus = paper.status && !isCurrent && !isScreen;
  const status = showStatus ? paper.status : '';
  const starSymbol = '\u2605';
  const confSymbol = '\u26D4';
  const possibleStar = isFavorite && showStars ? starSymbol : '';
  const suffixSym = isConflict ? confSymbol : possibleStar;
  const nid = paper.nid;
  const qid = paper.queue_order;
  const qidStr = qid ? 'Q' + qid : '';
  const prefix = qidStr + (nid && !isScreen ? ` (${nid}):` : '');
  const title = isPast ? status : paper.title;
  const screenTitle = isScreen ? '-' : title;
  const showTitle = isConflict ? 'CONFLICT' : screenTitle;
  const qEntryClass = isConflict ? 'bigger-font mx-auto' : '';

  return (
    <Container fluid className="QueueElement">
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
