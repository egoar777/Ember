export default function ModalCornerClose({ onClose, ariaLabel }) {
  return (
    <button
      type="button"
      className="modal-corner-close"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      aria-label={ariaLabel}
    >
      <span className="modal-corner-close__icon" aria-hidden="true" />
    </button>
  );
}
