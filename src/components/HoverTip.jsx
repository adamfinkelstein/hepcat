import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Tooltip from 'react-bootstrap/Tooltip';

export default function HoverTip(props) {
  const renderTooltip = <Tooltip>{props.children}</Tooltip>;

  const renderPopover = (
    <Popover>
      <Popover.Header className="bg-secondary text-white" as="h3">
        {props.header}
      </Popover.Header>
      <Popover.Body className="bg-dark text-white">
        {props.children}
      </Popover.Body>
    </Popover>
  );

  const renderer = props.header ? renderPopover : renderTooltip;
  const placement = props.placement || 'top';

  return (
    <OverlayTrigger
      className="HoverTip"
      placement={placement}
      delay={{ show: 250, hide: 400 }}
      overlay={renderer}
    >
      <Button size="sm" variant="outline-primary">
        {props.label}
      </Button>
    </OverlayTrigger>
  );
}
