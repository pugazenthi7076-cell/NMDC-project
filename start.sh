#!/bin/bash
# Start both ML API and Next.js frontend

echo "Starting ML API on port 5001..."
cd /app/ml-service && python app.py &
ML_PID=$!

echo "Starting Next.js on port 3000..."
cd /app && npm start &
NEXT_PID=$!

echo "ML API PID: $ML_PID"
echo "Next.js PID: $NEXT_PID"

# Wait for either to exit
wait $ML_PID $NEXT_PID
