import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 6;
const BLOCK_SHAPES = [
  // Single block
  [[1]],
  // Line shapes
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  // L shapes
  [[1, 0], [1, 1]],
  [[1, 1], [1, 0]],
  [[1, 1], [0, 1]],
  [[0, 1], [1, 1]],
  // Square
  [[1, 1], [1, 1]],
  // T shape
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1], [1, 1], [0, 1]],
  // Z shapes
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 0], [1, 1], [0, 1]],
  [[0, 1], [1, 1], [1, 0]]
];

const COLORS = [
  'from-blue-400/80 to-blue-600/90',
  'from-purple-400/80 to-purple-600/90',
  'from-pink-400/80 to-pink-600/90',
  'from-green-400/80 to-green-600/90',
  'from-yellow-400/80 to-yellow-600/90',
  'from-red-400/80 to-red-600/90',
  'from-indigo-400/80 to-indigo-600/90',
  'from-teal-400/80 to-teal-600/90'
];

function GlassBlockBlast() {
  const [grid, setGrid] = useState(() => 
    Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null))
  );
  const [score, setScore] = useState(0);
  const [currentBlocks, setCurrentBlocks] = useState([]);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [shatteringCells, setShatteringCells] = useState(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [gridHoverPosition, setGridHoverPosition] = useState(null);
  const [lightningEffect, setLightningEffect] = useState(false);
  const gridRef = useRef(null);

  // Sound effects
  const playGlassPlace = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create glass "tik" sound - high frequency short beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(1500, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(2000, audioContext.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const playGlassShatter = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create glass shatter sound - noise burst with high frequencies
      const bufferSize = audioContext.sampleRate * 0.5; // 0.5 seconds
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      // Generate white noise with frequency filtering for glass sound
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      
      const bufferSource = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      bufferSource.buffer = buffer;
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      
      bufferSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      bufferSource.start();
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  // Generate random block with color
  const generateBlock = useCallback(() => {
    const shape = BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      shape,
      color,
      id: Date.now() + Math.random()
    };
  }, []);

  // Initialize blocks
  useEffect(() => {
    setCurrentBlocks([generateBlock(), generateBlock(), generateBlock()]);
  }, [generateBlock]);

  // Check if block can be placed at position
  const canPlaceBlock = (shape, startRow, startCol) => {
    if (startRow < 0 || startCol < 0) return false;
    
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newRow = startRow + r;
          const newCol = startCol + c;
          if (newRow >= GRID_SIZE || newCol >= GRID_SIZE || newRow < 0 || newCol < 0) {
            return false;
          }
          if (grid[newRow][newCol]) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Place block on grid
  const placeBlock = (block, startRow, startCol) => {
    const newGrid = grid.map(row => [...row]);
    
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c]) {
          newGrid[startRow + r][startCol + c] = block.color;
        }
      }
    }
    
    // Play glass place sound
    playGlassPlace();
    
    setGrid(newGrid);
    
    // Remove used block and generate new one if all blocks used
    const newBlocks = currentBlocks.filter(b => b.id !== block.id);
    if (newBlocks.length === 0) {
      setCurrentBlocks([generateBlock(), generateBlock(), generateBlock()]);
    } else {
      setCurrentBlocks(newBlocks);
    }
    
    // Check for completed lines immediately with the new grid
    checkAndClearLines(newGrid);
  };

  // Check and clear completed lines
  const checkAndClearLines = (currentGrid) => {
    let cellsToShatter = new Set();
    let linesCleared = 0;
    
    // Check rows
    for (let r = 0; r < GRID_SIZE; r++) {
      if (currentGrid[r].every(cell => cell !== null)) {
        // Mark cells for shattering animation
        for (let c = 0; c < GRID_SIZE; c++) {
          cellsToShatter.add(`${r}-${c}`);
        }
        linesCleared++;
      }
    }
    
    // Check columns
    for (let c = 0; c < GRID_SIZE; c++) {
      if (currentGrid.every(row => row[c] !== null)) {
        // Mark cells for shattering animation
        for (let r = 0; r < GRID_SIZE; r++) {
          cellsToShatter.add(`${r}-${c}`);
        }
        linesCleared++;
      }
    }
    
    if (linesCleared > 0) {
      console.log('Lines cleared, cells to shatter:', cellsToShatter);
      
      // Play glass shatter sound and trigger lightning
      playGlassShatter();
      setLightningEffect(true);
      
      // Start shattering animation
      setShatteringCells(cellsToShatter);
      
      // Clear lightning effect
      setTimeout(() => {
        setLightningEffect(false);
      }, 300);
      
      // Clear cells after animation
      setTimeout(() => {
        const finalGrid = currentGrid.map(row => [...row]);
        
        // Clear rows
        for (let r = 0; r < GRID_SIZE; r++) {
          if (currentGrid[r].every(cell => cell !== null)) {
            finalGrid[r] = Array(GRID_SIZE).fill(null);
          }
        }
        
        // Clear columns
        for (let c = 0; c < GRID_SIZE; c++) {
          if (currentGrid.every(row => row[c] !== null)) {
            finalGrid.forEach(row => row[c] = null);
          }
        }
        
        console.log('Clearing grid after animation');
        setGrid(finalGrid);
        setShatteringCells(new Set());
        setScore(prev => prev + linesCleared * 100 * linesCleared);
      }, 800);
    }
  };

  // Check if any block can be placed
  const canPlaceAnyBlock = useCallback(() => {
    for (const block of currentBlocks) {
      for (let r = 0; r <= GRID_SIZE - block.shape.length; r++) {
        for (let c = 0; c <= GRID_SIZE - block.shape[0].length; c++) {
          if (canPlaceBlock(block.shape, r, c)) {
            return true;
          }
        }
      }
    }
    return false;
  }, [currentBlocks, grid]);

  // Check game over
  useEffect(() => {
    if (currentBlocks.length > 0 && !canPlaceAnyBlock()) {
      setGameOver(true);
    }
  }, [currentBlocks, canPlaceAnyBlock]);

  // Get grid position from mouse coordinates
  const getGridPosition = (clientX, clientY) => {
    if (!gridRef.current) return null;
    
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellSize = gridRect.width / GRID_SIZE;
    
    const col = Math.floor((clientX - gridRect.left) / cellSize);
    const row = Math.floor((clientY - gridRect.top) / cellSize);
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  };

  // Handle drag start
  const handleDragStart = (e, block) => {
    e.preventDefault();
    setDraggedBlock(block);
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent) => {
      setDragPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      
      const gridPos = getGridPosition(moveEvent.clientX, moveEvent.clientY);
      setGridHoverPosition(gridPos);
    };
    
    const handleMouseUp = (upEvent) => {
      const gridPos = getGridPosition(upEvent.clientX, upEvent.clientY);
      
      if (gridPos && canPlaceBlock(block.shape, gridPos.row, gridPos.col)) {
        placeBlock(block, gridPos.row, gridPos.col);
      }
      
      setIsDragging(false);
      setDraggedBlock(null);
      setGridHoverPosition(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Set initial position
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle touch events for mobile
  const handleTouchStart = (e, block) => {
    e.preventDefault();
    const touch = e.touches[0];
    setDraggedBlock(block);
    setIsDragging(true);
    
    const handleTouchMove = (moveEvent) => {
      const touch = moveEvent.touches[0];
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      
      const gridPos = getGridPosition(touch.clientX, touch.clientY);
      setGridHoverPosition(gridPos);
    };
    
    const handleTouchEnd = (endEvent) => {
      const touch = endEvent.changedTouches[0];
      const gridPos = getGridPosition(touch.clientX, touch.clientY);
      
      if (gridPos && canPlaceBlock(block.shape, gridPos.row, gridPos.col)) {
        placeBlock(block, gridPos.row, gridPos.col);
      }
      
      setIsDragging(false);
      setDraggedBlock(null);
      setGridHoverPosition(null);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    setDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  // Reset game
  const resetGame = () => {
    setGrid(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
    setScore(0);
    setCurrentBlocks([generateBlock(), generateBlock(), generateBlock()]);
    setDraggedBlock(null);
    setIsDragging(false);
    setShatteringCells(new Set());
    setLightningEffect(false);
    setGameOver(false);
  };

  // Get preview grid
  const getPreviewGrid = () => {
    if (!draggedBlock || !gridHoverPosition) return grid;
    
    const previewGrid = grid.map(row => [...row]);
    const { row, col } = gridHoverPosition;
    
    if (canPlaceBlock(draggedBlock.shape, row, col)) {
      for (let r = 0; r < draggedBlock.shape.length; r++) {
        for (let c = 0; c < draggedBlock.shape[r].length; c++) {
          if (draggedBlock.shape[r][c]) {
            const newRow = row + r;
            const newCol = col + c;
            if (newRow < GRID_SIZE && newCol < GRID_SIZE && newRow >= 0 && newCol >= 0) {
              previewGrid[newRow][newCol] = 'preview';
            }
          }
        }
      }
    }
    
    return previewGrid;
  };

  const previewGrid = getPreviewGrid();

  return (
    <div className={`h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 select-none overflow-hidden flex flex-col relative ${lightningEffect ? 'animate-pulse' : ''}`}>
      {/* Lightning Effect Overlay */}
      {lightningEffect && (
        <>
          <div className="fixed inset-0 bg-white/20 animate-ping pointer-events-none z-40" style={{ animationDuration: '150ms', animationIterationCount: '2' }} />
          <div className="fixed inset-0 pointer-events-none z-30">
            {/* Lightning bolts */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d="M20,10 L25,30 L15,30 L30,60 L20,60 L35,90" 
                stroke="rgba(255,255,255,0.9)" 
                strokeWidth="0.5" 
                fill="none" 
                className="animate-ping"
                style={{ animationDuration: '200ms', animationIterationCount: '1' }}
              />
              <path 
                d="M70,5 L75,25 L65,25 L80,55 L70,55 L85,85" 
                stroke="rgba(255,255,255,0.8)" 
                strokeWidth="0.3" 
                fill="none" 
                className="animate-ping"
                style={{ animationDuration: '250ms', animationIterationCount: '1', animationDelay: '50ms' }}
              />
              <path 
                d="M45,0 L50,20 L40,20 L55,50 L45,50 L60,80" 
                stroke="rgba(255,255,255,0.7)" 
                strokeWidth="0.4" 
                fill="none" 
                className="animate-ping"
                style={{ animationDuration: '180ms', animationIterationCount: '1', animationDelay: '100ms' }}
              />
            </svg>
          </div>
        </>
      )}

      <div className="max-w-md mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-4 flex-shrink-0">
          <div className="text-lg font-semibold text-white">
            Score: {score.toLocaleString()}
          </div>
        </div>

        {/* Game Grid */}
        <div className="mb-4 p-3 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/10 flex-shrink-0">
          <div 
            ref={gridRef}
            className="grid grid-cols-6 gap-1 mx-auto w-fit"
          >
            {previewGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isShattered = shatteringCells.has(cellKey);
                
                return (
                  <div
                    key={cellKey}
                    className={`w-12 h-12 rounded-lg border-2 transition-all duration-300 relative overflow-visible ${
                      cell === 'preview'
                        ? `bg-gradient-to-br ${draggedBlock.color} opacity-60 border-white/60 shadow-2xl backdrop-blur-lg scale-105`
                        : cell
                        ? `bg-gradient-to-br ${cell} border-white/40 shadow-2xl backdrop-blur-lg transform border-t-white/60 border-l-white/50 ${
                            isShattered ? 'animate-pulse border-red-400' : ''
                          }`
                        : 'bg-white/5 border-white/20 backdrop-blur-sm'
                    } ${cell && cell !== 'preview' ? 'shadow-inner' : ''}`}
                    style={cell && cell !== 'preview' ? {
                      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.3), 0 4px 16px rgba(255,255,255,0.1)'
                    } : {}}
                  >
                    {/* Glass Shatter Effect */}
                    {isShattered && (
                      <div className="absolute inset-0 z-50 pointer-events-none">
                        {/* Flash effect - bright white flash */}
                        <div 
                          className="absolute inset-0 bg-white rounded-lg animate-ping" 
                          style={{ 
                            animationDuration: '150ms', 
                            animationIterationCount: '3',
                            opacity: '0.8'
                          }} 
                        />
                        
                        {/* Explosion ring */}
                        <div 
                          className="absolute inset-0 border-4 border-yellow-300 rounded-lg animate-ping"
                          style={{
                            animationDuration: '400ms',
                            animationIterationCount: '2'
                          }}
                        />
                        
                        {/* Flying shards */}
                        {[...Array(16)].map((_, i) => (
                          <div
                            key={`shard-${i}`}
                            className="absolute bg-white animate-bounce shadow-lg"
                            style={{
                              width: `${Math.random() * 4 + 2}px`,
                              height: `${Math.random() * 4 + 2}px`,
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${i * 25}ms`,
                              animationDuration: '600ms',
                              transform: `rotate(${Math.random() * 360}deg) translateX(${Math.random() * 20 - 10}px) translateY(${Math.random() * 20 - 10}px)`,
                              borderRadius: '1px',
                              zIndex: 100
                            }}
                          />
                        ))}
                        
                        {/* Crack pattern */}
                        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 99 }}>
                          <line x1="0" y1="0" x2="100%" y2="100%" stroke="white" strokeWidth="1" opacity="0.7" className="animate-pulse" />
                          <line x1="100%" y1="0" x2="0" y2="100%" stroke="white" strokeWidth="1" opacity="0.7" className="animate-pulse" />
                          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="1" opacity="0.5" className="animate-pulse" />
                          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="1" opacity="0.5" className="animate-pulse" />
                        </svg>
                        
                        {/* Sparkle burst */}
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={`spark-${i}`}
                            className="absolute w-2 h-2 bg-yellow-200 rounded-full animate-ping"
                            style={{
                              left: `${Math.random() * 90 + 5}%`,
                              top: `${Math.random() * 90 + 5}%`,
                              animationDelay: `${i * 50}ms`,
                              animationDuration: '400ms',
                              animationIterationCount: '3',
                              zIndex: 101
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Current Blocks */}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-semibold text-white mb-3 text-center">Drag Blocks to Grid</h3>
          <div className="flex justify-center gap-4">
            {currentBlocks.map((block) => (
              <div
                key={block.id}
                className={`p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
                  isDragging && draggedBlock?.id === block.id
                    ? 'opacity-50'
                    : 'bg-white/10 border border-white/20 hover:bg-white/15 hover:scale-105'
                } backdrop-blur-sm`}
                onMouseDown={(e) => handleDragStart(e, block)}
                onTouchStart={(e) => handleTouchStart(e, block)}
                style={isDragging && draggedBlock?.id === block.id ? { visibility: 'hidden' } : {}}
              >
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${block.shape[0].length}, 1fr)` }}>
                  {block.shape.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-8 h-8 rounded-lg ${
                          cell ? `bg-gradient-to-br ${block.color} border-2 border-white/40 shadow-2xl backdrop-blur-lg border-t-white/60 border-l-white/50` : ''
                        }`}
                        style={cell ? {
                          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.25), 0 6px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(255,255,255,0.15)'
                        } : {}}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dragged Block */}
      {isDragging && draggedBlock && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
          }}
        >
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${draggedBlock.shape[0].length}, 1fr)` }}>
            {draggedBlock.shape.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-8 h-8 rounded-lg ${
                    cell ? `bg-gradient-to-br ${draggedBlock.color} border-2 border-white/40 shadow-2xl backdrop-blur-lg border-t-white/60 border-l-white/50 scale-110` : ''
                  }`}
                  style={cell ? {
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.25), 0 8px 24px rgba(0,0,0,0.4), 0 4px 12px rgba(255,255,255,0.2)'
                  } : {}}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-white/20 text-center backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
            <p className="text-lg text-gray-200 mb-4">Final Score: {score.toLocaleString()}</p>
            <button
              onClick={resetGame}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlassBlockBlast;