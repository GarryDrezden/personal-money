import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { QuickStartGuide } from '../shared/QuickStartGuide';
import { markQuickStartDismissed } from '../../utils/quickStart';

interface QuickStartModalProps {
  userId: string;
  onClose: () => void;
}

export function QuickStartModal({ userId, onClose }: QuickStartModalProps) {
  const handleClose = () => {
    markQuickStartDismissed(userId);
    onClose();
  };

  return (
    <Modal title="Быстрый старт" onClose={handleClose}>
      <QuickStartGuide onNavigate={handleClose} compact />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] pt-4">
        <Link
          to="/faq"
          onClick={handleClose}
          className="text-sm text-[var(--app-text-muted)] hover:text-[var(--app-primary)]"
        >
          Полная справка в FAQ
        </Link>
        <button type="button" onClick={handleClose} className="btn-primary rounded-lg px-4 py-2 text-sm">
          Понятно, начать
        </button>
      </div>
    </Modal>
  );
}
