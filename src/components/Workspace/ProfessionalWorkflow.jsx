import { useCallback, useEffect, useRef, useState } from 'react';
import InteractiveCanvas from './InteractiveCanvas';
import MaterialDialog from './MaterialDialog';
import WorkflowToolbar from './WorkflowToolbar';
import { readBoard, writeBoard } from '../../services/workflow-board';
import { modelOptions } from '../../services/workflow-options';
import {
  removeWorkflowAsset,
  saveWorkflowAsset,
  uploadWorkflowAsset,
  validateNodeFile,
} from '../../services/workflow-assets';
import './professional-workflow.css';

export default function ProfessionalWorkflow({
  user,
  models,
  modelsLoading,
  modelError,
  items,
  loading,
  error,
  active,
}) {
  const [board, setBoard] = useState(() => readBoard(user.id));
  const [material, setMaterial] = useState(null),
    [fileError, setFileError] = useState(''),
    [busy, setBusy] = useState(false);
  const canvasApi = useRef(null),
    currentBoard = useRef(board),
    live = useRef(true),
    savingFile = useRef(false);
  currentBoard.current = board;
  useEffect(() => {
    live.current = true;
    const save = () => writeBoard(user.id, currentBoard.current);
    window.addEventListener('pagehide', save);
    return () => {
      live.current = false;
      save();
      window.removeEventListener('pagehide', save);
    };
  }, [user.id]);
  useEffect(() => {
    const timer = setTimeout(() => writeBoard(user.id, board), 250);
    return () => clearTimeout(timer);
  }, [board, user.id]);
  const onViewportChange = useCallback(
    (viewport) =>
      setBoard((current) => {
        const previous = current.viewport;
        return previous.x === viewport.x &&
          previous.y === viewport.y &&
          previous.zoom === viewport.zoom
          ? current
          : { ...current, viewport };
      }),
    [],
  );
  const updateNode = useCallback(
    (id, update) =>
      setBoard((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? { ...node, ...update } : node)),
      })),
    [],
  );
  function addNode(type, data, configuration = {}) {
    if (currentBoard.current.nodes.length >= 200) {
      setFileError('На доске уже 200 узлов. Удалите ненужные.');
      return;
    }
    setFileError('');
    const position = canvasApi.current.placeNode({
      width: 280,
      height: type === 'model' ? 360 : type === 'prompt' ? 260 : 270,
    });
    const node = { id: crypto.randomUUID(), type, position, data, configuration };
    canvasApi.current.selectNode(node.id);
    setBoard((current) => ({ ...current, nodes: [...current.nodes, node] }));
    return node;
  }
  function removeNode(id) {
    const removed = currentBoard.current.nodes.find((node) => node.id === id);
    setBoard((current) => ({ ...current, nodes: current.nodes.filter((node) => node.id !== id) }));
    if (
      removed?.data.assetId &&
      !currentBoard.current.nodes.some(
        (node) => node.id !== id && node.data.assetId === removed.data.assetId,
      )
    )
      removeWorkflowAsset(
        removed.data.assetId,
        () =>
          !currentBoard.current.nodes.some(
            (node) => node.id !== id && node.data.assetId === removed.data.assetId,
          ),
      ).catch(() => {});
  }
  async function uploadNode(node) {
    try {
      const asset = await uploadWorkflowAsset(node.data.assetId);
      if (live.current)
        setBoard((current) => ({
          ...current,
          nodes: current.nodes.map((item) =>
            item.data.assetId === asset.id
              ? {
                  ...item,
                  data: { ...item.data, uploadId: asset.uploadId || null, uploadError: '' },
                }
              : item,
          ),
        }));
    } catch (err) {
      if (live.current)
        setBoard((current) => ({
          ...current,
          nodes: current.nodes.map((item) =>
            item.data.assetId === node.data.assetId
              ? { ...item, data: { ...item.data, uploadError: err.message } }
              : item,
          ),
        }));
    }
  }
  async function addFile(file, type) {
    if (savingFile.current) return;
    const message = validateNodeFile(file, type);
    if (message) {
      setFileError(message);
      return;
    }
    savingFile.current = true;
    setBusy(true);
    setFileError('');
    try {
      const asset = await saveWorkflowAsset(user.id, file);
      if (!live.current) return;
      const node = addNode(type, {
        assetId: asset.id,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        uploadId: asset.uploadId || null,
      });
      if (node) uploadNode(node);
    } catch (err) {
      if (live.current) setFileError(err.message);
    } finally {
      savingFile.current = false;
      if (live.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="wf-board-area wf-professional-board">
        <InteractiveCanvas
          canvasApi={canvasApi}
          items={items.filter((item) => !board.hiddenGenerations.includes(item.id))}
          nodes={board.nodes}
          models={models}
          loading={loading}
          error={error}
          positions={board.positions}
          initialViewport={board.viewport}
          onViewportChange={onViewportChange}
          onMove={(id, position) =>
            setBoard((current) =>
              current.nodes.some((node) => node.id === id)
                ? {
                    ...current,
                    nodes: current.nodes.map((node) =>
                      node.id === id ? { ...node, position } : node,
                    ),
                  }
                : { ...current, positions: { ...current.positions, [id]: position } },
            )
          }
          onNodeChange={updateNode}
          onNodeDelete={removeNode}
          onRetryUpload={uploadNode}
          onRemoveGeneration={(id) =>
            setBoard((current) => ({
              ...current,
              hiddenGenerations: [...current.hiddenGenerations, id],
            }))
          }
          onDerive={(item) => addNode('prompt', { text: item.prompt })}
          onOpen={setMaterial}
        />
        <WorkflowToolbar
          active={active}
          models={models}
          modelsLoading={modelsLoading}
          modelError={modelError}
          onAddPrompt={(text) => addNode('prompt', { text })}
          onAddModel={(model) => {
            const mode = Object.keys(model.modes)[0];
            addNode(
              'model',
              { modelId: model.id, name: model.name },
              { mode, ...modelOptions(model.modes[mode]) },
            );
          }}
          onFile={addFile}
          error={fileError}
          busy={busy}
        />
      </div>
      <MaterialDialog
        key={material?.id || 'closed'}
        item={material}
        onClose={() => setMaterial(null)}
      />
    </>
  );
}
