import { useState, useCallback, useRef } from 'react';

type DialogMode = 'confirm' | 'alert';

interface DialogState {
  open: boolean;
  message: string;
  mode: DialogMode;
}

const CLOSED: DialogState = { open: false, message: '', mode: 'confirm' };

export function useConfirm() {
  const [state, setState] = useState<DialogState>(CLOSED);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, message, mode: 'confirm' });
    });
  }, []);

  const alert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = (v) => { resolve(); };
      setState({ open: true, message, mode: 'alert' });
    });
  }, []);

  const handleOk = () => {
    setState(CLOSED);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setState(CLOSED);
    resolveRef.current?.(false);
  };

  const confirmModal = state.open ? (
    <div
      className="modal-overlay"
      onMouseDown={state.mode === 'alert' ? handleOk : handleCancel}
      style={{ zIndex: 2000 }}
    >
      <div
        className="modal"
        style={{ maxWidth: 400, padding: '28px 32px' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {state.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {state.mode === 'confirm' && (
            <button className="btn btn-outline" onClick={handleCancel}>
              İptal
            </button>
          )}
          <button
            className={state.mode === 'confirm' ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={handleOk}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, alert, confirmModal };
}
