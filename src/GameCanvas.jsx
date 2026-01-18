import React, { useRef, useEffect, useState } from 'react';

const GameCanvas = ({ 
  onScoreCalculated, 
  isDrawingAllowed, 
  onDrawingStart, 
  onDrawingEnd,
  resetTrigger 
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  
  // Setup canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
    
    // Draw guide center point (subtle)
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff22';
    ctx.fill();
    
    // Draw guide circle (optional, maybe too easy? Let's just do a center dot)
  }, [resetTrigger]);

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if (e.changedTouches) {
      x = e.changedTouches[0].clientX - rect.left;
      y = e.changedTouches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    // Add point
    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    // Draw segment
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.stroke();
    }
  };

  const startDrawing = (e) => {
    if (!isDrawingAllowed) return;
    setIsDrawing(true);
    setPoints([]); // Clear previous points on new start? 
    // Actually, usually you get one stroke. calculate on up.
    
    // Clear canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    onDrawingStart();
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onDrawingEnd();
    calculateScore();
  };

  const calculateScore = () => {
    if (points.length < 10) {
      onScoreCalculated(0); // Too short
      return;
    }

    // 1. Find Centroid
    let sumX = 0, sumY = 0;
    points.forEach(p => { sumX += p.x; sumY += p.y; });
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    // 2. Calculate average radius
    let sumR = 0;
    points.forEach(p => {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      sumR += Math.sqrt(dx*dx + dy*dy);
    });
    const avgR = sumR / points.length;

    // 3. Calculate variance/error
    let errorSum = 0;
    points.forEach(p => {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const r = Math.sqrt(dx*dx + dy*dy);
      // Normalized error relative to radius
      errorSum += Math.abs(r - avgR);
    });
    
    const avgError = errorSum / points.length;
    const errorRatio = avgError / avgR; // Percentage error

    // 4. Convert to "Accuracy %"
    // Heuristic: 0 error = 100%. 10% deviation = 50% score? 
    // Let's make it strict but fair.
    // Score = 100 * (1 - errorRatio * strictness)
    // If errorRatio is 0.05 (5% deviation), let's say that's a 90% score.
    // 90 = 100 * (1 - 0.05 * k) -> 0.9 = 1 - 0.05k -> 0.05k = 0.1 -> k = 2
    
    let score = 100 * (1 - errorRatio * 3.5); 
    
    // Closure check: distance between first and last point
    const first = points[0];
    const last = points[points.length - 1];
    const closureDist = Math.sqrt(Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2));
    const closurePenalty = (closureDist / avgR) * 20; // Penalty if not closed
    
    score -= closurePenalty;

    if (score < 0) score = 0;
    if (score > 100) score = 100;
    
    console.log(`Stats: R=${avgR.toFixed(1)}, Err=${(errorRatio*100).toFixed(1)}%, Closure=${closurePenalty.toFixed(1)}`);
    
    onScoreCalculated(score);
    
    // Visual feedback: Draw the perfect circle for comparison
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw Center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI*2);
    ctx.fillStyle = '#ff0055';
    ctx.fill();

    // Draw Perfect Circle (ghost)
    ctx.beginPath();
    ctx.arc(centerX, centerY, avgR, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
};

export default GameCanvas;
