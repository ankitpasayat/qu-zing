import { useState, useEffect, useRef } from 'react';
import type { GameSession, Player, Question, PlayerVote } from '../types/game';
import { getDisplayName } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { TokenSelector } from './TokenSelector';
import { ThemeToggle } from './ThemeToggle';
import { LobbyCodeDisplay } from './BrowserLobby';

// Countdown Timer Component
function CountdownTimer({ 
  duration, 
  startedAt,
  onComplete, 
  label = "Time remaining"
}: { 
  duration: number;
  startedAt?: number | null; // Server timestamp when timer started
  onComplete: () => void; 
  label?: string;
}) {
  // Calculate initial time left based on server sync (use function to defer Date.now() call)
  const [timeLeft, setTimeLeft] = useState(() => {
    if (startedAt) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      return Math.max(0, duration - elapsed);
    }
    return duration;
  });
  const [progress, setProgress] = useState(100);
  const onCompleteRef = useRef(onComplete);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  // Keep the ref updated with the latest callback
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Use server time if available, otherwise use client time
    startTimeRef.current = startedAt || Date.now();
    let completed = false;
    
    // Update progress bar smoothly with requestAnimationFrame
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration * 1000 - elapsed);
      const newProgress = (remaining / (duration * 1000)) * 100;
      
      setProgress(newProgress);
      
      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    
    // Start smooth progress animation
    animationFrameRef.current = requestAnimationFrame(updateProgress);
    
    // Update time display based on actual elapsed time
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        if (!completed) {
          completed = true;
          // Delay callback slightly to ensure 0 is displayed
          setTimeout(() => onCompleteRef.current(), 100);
        }
      }
    }, 100); // Update more frequently for accuracy

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameRef.current);
      completed = true; // Prevent callback if component unmounts
    };
  }, [duration, startedAt]);

  // Calculate color based on progress (100% = purple, 0% = deep red)
  // Interpolate between purple (#a855f7) and deep red (#dc2626)
  const getProgressColor = (progressPercent: number) => {
    // Purple RGB: 168, 85, 247
    // Deep Red RGB: 220, 38, 38
    const purpleR = 168, purpleG = 85, purpleB = 247;
    const redR = 220, redG = 38, redB = 38;
    
    // Use a curve to make the transition more dramatic in the last 40%
    const t = Math.pow(1 - progressPercent / 100, 1.3);
    
    const r = Math.round(purpleR + (redR - purpleR) * t);
    const g = Math.round(purpleG + (redG - purpleG) * t);
    const b = Math.round(purpleB + (redB - purpleB) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const progressColor = getProgressColor(progress);
  const isUrgent = timeLeft <= 3;

  return (
    <div className="w-full max-w-sm mt-8 mx-auto">
      <div className="text-center mb-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <div 
          className={`text-4xl font-bold mt-1 ${isUrgent ? 'animate-pulse' : ''}`}
          style={{ color: progressColor }}
        >
          {timeLeft}s
        </div>
      </div>
      <div className="w-full h-3 bg-purple-200/50 dark:bg-purple-900/30 rounded-full overflow-hidden border border-purple-300/50 dark:border-purple-700/30">
        <div 
          className="h-full"
          style={{ 
            width: `${progress}%`, 
            background: `linear-gradient(90deg, ${progressColor}, ${getProgressColor(Math.max(0, progress - 20))})` 
          }}
        />
      </div>
    </div>
  );
}

interface GamePlayProps {
  session: GameSession;
  currentPlayer: Player;
  isHost: boolean;
  onChangePhase: (phase: string) => void;
  onSubmitVote: (answer: number | boolean, token: number) => void;
  onAutoVote?: (playerId: string) => void;
  onExitGame?: () => void;
}

export function GamePlay({ 
  session, 
  currentPlayer, 
  isHost, 
  onChangePhase, 
  onSubmitVote,
  onAutoVote,
  onExitGame 
}: GamePlayProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Track question/phase to reset selections
  const questionPhaseKey = `${session.currentQuestion?.id || 'no-q'}-${session.currentPhase}`;
  const [lastResetKey, setLastResetKey] = useState(questionPhaseKey);
  const [selectedAnswer, setSelectedAnswer] = useState<number | boolean | null>(null);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);

  // Reset selections when question/phase changes (but only if not a spectator)
  // Spectators shouldn't have their state reset since they can't vote anyway
  if (lastResetKey !== questionPhaseKey && !currentPlayer.isSpectator) {
    setLastResetKey(questionPhaseKey);
    setSelectedAnswer(null);
    setSelectedToken(null);
  }
  
  const { currentPhase, currentQuestion, currentRound, totalRounds, votes, players } = session;
  const hasVoted = votes.some((v: PlayerVote) => v.playerId === currentPlayer.id);
  
  // Check spectator status - also verify player is in spectators array (handles promotion transition)
  // During the brief moment of promotion, isSpectator flag might be stale
  const isInSpectatorsArray = session.spectators?.some(s => s.id === currentPlayer.id) ?? false;
  const isSpectator = currentPlayer.isSpectator || isInSpectatorsArray;

  const handleSubmit = () => {
    if (selectedAnswer !== null && selectedToken !== null && !hasVoted) {
      onSubmitVote(selectedAnswer, selectedToken);
    }
  };

  const handleVotingTimeout = () => {
    // Auto-submit for current player if they haven't voted
    if (!hasVoted && !isSpectator && currentQuestion) {
      // Use selected values if available, otherwise use defaults
      const token = selectedToken !== null 
        ? selectedToken 
        : Math.min(...currentPlayer.availableTokens);
      const answer = selectedAnswer !== null 
        ? selectedAnswer 
        : getRandomAnswer(currentQuestion);
      onSubmitVote(answer, token);
    }
    
    // If host, trigger server-side auto-vote for all players who haven't voted
    if (isHost && onAutoVote) {
      const activePlayers = players.filter((p: Player) => !p.isSpectator && p.isConnected);
      activePlayers.forEach((player: Player) => {
        const playerVoted = votes.some((v: PlayerVote) => v.playerId === player.id);
        if (!playerVoted) {
          onAutoVote(player.id);
        }
      });
    }
  };

  const getRandomAnswer = (question: Question): number | boolean => {
    switch (question.type) {
      case 'multiple-choice':
        return Math.floor(Math.random() * question.options.length);
      case 'true-false':
        return Math.random() > 0.5;
      case 'more-or-less':
        return Math.random() > 0.5 ? 1 : 0;
      case 'numerical':
        // Return NaN so auto-submit without typing gets no points
        return NaN;
      default:
        return 0;
    }
  };

  // Check if solo mode (only one active player)
  const activePlayerCount = players.filter((p: Player) => !p.isSpectator).length;
  const isSoloMode = activePlayerCount === 1;
  const isBrowserMode = session.platform === 'browser';

  // Compact lobby code display for browser mode during gameplay
  const lobbyCodeBadge = isBrowserMode && (
    <div className="absolute top-4 right-16 z-10">
      <LobbyCodeDisplay lobbyCode={session.channelId} compact />
    </div>
  );

  // Exit confirmation modal content
  const exitConfirmModal = showExitConfirm && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#231942] rounded-2xl p-6 max-w-sm w-full border-2 border-purple-300 dark:border-purple-700/50 shadow-xl">
        <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Exit Game?</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isSoloMode 
            ? "Are you sure you want to end your solo game? Your progress will be lost."
            : "Are you sure you want to leave the game? You can rejoin later if the game is still in progress."
          }
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExitConfirm(false)}
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-purple-900/50 hover:bg-gray-300 dark:hover:bg-purple-800/50 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowExitConfirm(false);
              onExitGame?.();
            }}
            className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
          >
            Exit Game
          </button>
        </div>
      </div>
    </div>
  );

  // Question Phase - Display question
  if (currentPhase === 'question' && currentQuestion) {
    // Show a special "waiting to join" screen for spectators during question phase
    if (isSpectator) {
      return (
        <div className="min-h-screen flex flex-col p-4 safe-area-inset bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
          {exitConfirmModal}
          <ThemeToggle />
          {lobbyCodeBadge}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="absolute top-4 left-4 p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors z-10"
            title="Exit game"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full text-center">
            <div className="text-6xl mb-6">🎮</div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              You're In!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              A round is currently in progress. You'll join the action on the next question!
            </p>
            
            <div className="w-full bg-white/80 dark:bg-[#231942]/70 border border-purple-200/50 dark:border-purple-700/30 rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Game Progress</span>
                <span className="text-sm font-medium px-3 py-1 bg-amber-100/80 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 rounded-full text-amber-700 dark:text-amber-300">
                  {currentQuestion.category}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">{currentRound}</span>
                <span className="text-gray-400 dark:text-gray-500">/</span>
                <span className="text-xl text-gray-600 dark:text-gray-400">{totalRounds}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">questions completed</p>
            </div>
            
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Waiting for current round to finish...</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col p-4 safe-area-inset bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
        {exitConfirmModal}
        <ThemeToggle />
        {lobbyCodeBadge}
        {/* Exit button */}
        <button
          onClick={() => setShowExitConfirm(true)}
          className="absolute top-4 left-4 p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors z-10"
          title="Exit game"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <div className="mb-4">
          <h2 className="text-center text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
            Next Question
          </h2>
          <Header round={currentRound} totalRounds={totalRounds} category={currentQuestion.category} />
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <QuestionDisplay question={currentQuestion} />
          
          <CountdownTimer
            key={`question-${currentRound}`}
            duration={session.settings.timeBetweenQuestions}
            startedAt={session.questionPhaseStartedAt}
            onComplete={isHost ? () => onChangePhase('voting') : () => {}}
            label="Starting in"
          />
        </div>
      </div>
    );
  }

  // Voting Phase
  if (currentPhase === 'voting' && currentQuestion) {
    const activePlayers = players.filter((p: Player) => !p.isSpectator && p.isConnected);
    
    // Show a special "waiting to join" screen for spectators during voting phase
    if (isSpectator) {
      return (
        <div className="min-h-screen flex flex-col p-4 safe-area-inset bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
          {exitConfirmModal}
          <ThemeToggle />
          {lobbyCodeBadge}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="absolute top-4 left-4 p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors z-10"
            title="Exit game"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full text-center">
            <div className="text-6xl mb-6">⏳</div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Round in Progress
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Players are answering the current question. Get ready for the next one!
            </p>
            
            <div className="w-full bg-white/80 dark:bg-[#231942]/70 border border-purple-200/50 dark:border-purple-700/30 rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Voting Progress</span>
                <span className="text-sm font-medium px-3 py-1 bg-emerald-100/80 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 rounded-full text-emerald-700 dark:text-emerald-300">
                  {votes.length}/{activePlayers.length} voted
                </span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {activePlayers.map((player: Player) => {
                  const hasPlayerVoted = votes.some((v: PlayerVote) => v.playerId === player.id);
                  return (
                    <div 
                      key={player.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        hasPlayerVoted 
                          ? 'bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/40' 
                          : 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600/40'
                      }`}
                    >
                      <PlayerAvatar user={player.discordUser} size={24} />
                      <span className="text-sm font-medium">{getDisplayName(player.discordUser)}</span>
                      {hasPlayerVoted && <span className="text-green-600 dark:text-green-400">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Round {currentRound} of {totalRounds} • {currentQuestion.category}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex flex-col p-4 pb-32 safe-area-inset bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
        {exitConfirmModal}
        <ThemeToggle />
        {lobbyCodeBadge}
        {/* Exit button */}
        <button
          onClick={() => setShowExitConfirm(true)}
          className="absolute top-4 left-4 p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors z-10"
          title="Exit game"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <div className="mb-6 md:mb-8">
          <h2 className="text-center text-xl md:text-2xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Make Your Choice
          </h2>
          <Header 
            round={currentRound} 
            totalRounds={totalRounds} 
            category={currentQuestion.category}
            votedCount={votes.length}
            totalPlayers={activePlayers.length}
          />
        </div>
        
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <QuestionDisplay question={currentQuestion} compact />
          
          <CountdownTimer
            key={`voting-${currentRound}`}
            duration={session.settings.timeToAnswer}
            startedAt={session.votingPhaseStartedAt}
            onComplete={handleVotingTimeout}
            label="Time to answer"
          />
          
          {hasVoted ? (
            <div className="mt-6 text-center p-6 bg-green-100 dark:bg-green-500/20 border border-green-400 dark:border-green-500/40 rounded-xl shadow-lg">
              <p className="text-green-700 dark:text-green-300 font-medium text-lg">Vote Submitted! ✓</p>
              <p className="text-sm text-green-600 dark:text-green-400/70 mt-1">
                Waiting for others... ({votes.length}/{activePlayers.length})
              </p>
            </div>
          ) : (
            <>
              <AnswerOptions 
                question={currentQuestion} 
                selectedAnswer={selectedAnswer}
                onSelect={setSelectedAnswer}
              />
              
              <TokenSelector
                availableTokens={currentPlayer.availableTokens}
                selectedToken={selectedToken}
                onSelect={setSelectedToken}
                disabled={selectedAnswer === null}
              />
              
              <button
                onClick={handleSubmit}
                disabled={selectedAnswer === null || selectedToken === null}
                className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl shadow-lg transform transition-all active:scale-95 disabled:cursor-not-allowed"
              >
                {selectedAnswer !== null && selectedToken !== null 
                  ? 'Submit Vote' 
                  : 'Select answer and token'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Reveal Phase
  if (currentPhase === 'reveal' && currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col p-4 pb-24 safe-area-inset bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
        {exitConfirmModal}
        <ThemeToggle />
        {lobbyCodeBadge}
        {/* Exit button */}
        <button
          onClick={() => setShowExitConfirm(true)}
          className="absolute top-4 left-4 p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors z-10"
          title="Exit game"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
        <div className="mb-4">
          <h2 className="text-center text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-green-500 to-blue-500 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
            The Answer
          </h2>
          <Header round={currentRound} totalRounds={totalRounds} category={currentQuestion.category} />
        </div>
        
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <RevealDisplay 
            question={currentQuestion}
            votes={votes}
            players={players}
            currentPlayerId={currentPlayer.id}
          />
          
          <CountdownTimer
            key={`reveal-${currentRound}`}
            duration={session.settings.timeToViewAnswer}
            startedAt={session.revealPhaseStartedAt}
            onComplete={isHost ? () => onChangePhase('question') : () => {}}
            label={currentRound >= totalRounds ? 'Final results in' : 'Next question in'}
          />
        </div>
      </div>
    );
  }

  return null;
}

// Sub-components

function Header({ 
  round, 
  totalRounds, 
  category, 
  votedCount, 
  totalPlayers 
}: { 
  round: number; 
  totalRounds: number; 
  category: string;
  votedCount?: number;
  totalPlayers?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-4">
      <span className="text-sm font-medium px-3 py-1 bg-white/60 dark:bg-[#231942]/60 border border-purple-200/50 dark:border-purple-600/40 rounded-full text-purple-700 dark:text-purple-300">
        Round {round}/{totalRounds}
      </span>
      <span className="text-sm font-medium px-3 py-1 bg-amber-100/80 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 rounded-full text-amber-700 dark:text-amber-300">
        {category}
      </span>
      {votedCount !== undefined && totalPlayers !== undefined && (
        <span className="text-sm font-medium px-3 py-1 bg-emerald-100/80 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 rounded-full text-emerald-700 dark:text-emerald-300">
          {votedCount}/{totalPlayers} voted
        </span>
      )}
    </div>
  );
}

function QuestionDisplay({ question, compact = false }: { question: Question; compact?: boolean }) {
  return (
    <div className={`w-full bg-white/80 dark:bg-[#231942]/70 border border-purple-200/50 dark:border-purple-700/30 rounded-2xl p-6 shadow-lg ${compact ? 'mb-4' : ''}`}>
      <h2 className={`font-semibold leading-relaxed ${compact ? 'text-lg' : 'text-xl md:text-2xl'}`}>
        {question.text}
      </h2>
    </div>
  );
}

function AnswerOptions({ 
  question, 
  selectedAnswer, 
  onSelect 
}: { 
  question: Question; 
  selectedAnswer: number | boolean | null;
  onSelect: (answer: number | boolean) => void;
}) {
  if (question.type === 'multiple-choice') {
    return (
      <div className="mt-4 space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`w-full p-4 rounded-xl text-left font-medium transition-all
              ${selectedAnswer === index 
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white ring-2 ring-purple-400 shadow-lg' 
                : 'bg-white/80 dark:bg-[#231942]/60 hover:bg-purple-50 dark:hover:bg-[#2d1f4e]/70 border border-purple-200/50 dark:border-purple-700/40'
              }`}
          >
            <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span>
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'true-false') {
    return (
      <div className="mt-4 grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect(true)}
          className={`p-6 rounded-xl font-bold text-xl transition-all
            ${selectedAnswer === true 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white ring-2 ring-green-400 shadow-lg' 
              : 'bg-white/80 dark:bg-[#231942]/60 hover:bg-green-50 dark:hover:bg-[#2d1f4e]/70 border border-purple-200/50 dark:border-purple-700/40'
            }`}
        >
          TRUE
        </button>
        <button
          onClick={() => onSelect(false)}
          className={`p-6 rounded-xl font-bold text-xl transition-all
            ${selectedAnswer === false 
              ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white ring-2 ring-red-400 shadow-lg' 
              : 'bg-white/80 dark:bg-[#231942]/60 hover:bg-red-50 dark:hover:bg-[#2d1f4e]/70 border border-purple-200/50 dark:border-purple-700/40'
            }`}
        >
          FALSE
        </button>
      </div>
    );
  }

  if (question.type === 'more-or-less') {
    return (
      <div className="mt-4 space-y-3">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">Which one is more/larger?</p>
        <button
          onClick={() => onSelect(0)}
          className={`w-full p-5 rounded-xl font-medium text-lg transition-all
            ${selectedAnswer === 0 
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white ring-2 ring-purple-400 shadow-lg' 
              : 'bg-white/80 dark:bg-[#231942]/60 hover:bg-purple-50 dark:hover:bg-[#2d1f4e]/70 border border-purple-200/50 dark:border-purple-700/40'
            }`}
        >
          {question.option1}
        </button>
        <div className="text-center text-gray-400 dark:text-gray-500 text-sm font-bold">OR</div>
        <button
          onClick={() => onSelect(1)}
          className={`w-full p-5 rounded-xl font-medium text-lg transition-all
            ${selectedAnswer === 1 
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white ring-2 ring-purple-400 shadow-lg' 
              : 'bg-white/80 dark:bg-[#231942]/60 hover:bg-purple-50 dark:hover:bg-[#2d1f4e]/70 border border-purple-200/50 dark:border-purple-700/40'
            }`}
        >
          {question.option2}
        </button>
      </div>
    );
  }

  if (question.type === 'numerical') {
    return (
      <div className="mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Enter your answer {question.unit ? `(in ${question.unit})` : ''}:
        </p>
        <input
          type="number"
          value={typeof selectedAnswer === 'number' ? selectedAnswer : ''}
          onChange={(e) => onSelect(e.target.value !== '' ? Number(e.target.value) : null as unknown as number)}
          placeholder="Your answer..."
          className="w-full p-4 rounded-xl bg-white/80 dark:bg-[#231942]/60 border-2 border-purple-200/50 dark:border-purple-700/40 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-lg"
        />
      </div>
    );
  }

  return null;
}

function RevealDisplay({ 
  question, 
  votes, 
  players,
  currentPlayerId 
}: { 
  question: Question;
  votes: PlayerVote[];
  players: Player[];
  currentPlayerId: string;
}) {
  const getCorrectAnswerDisplay = (): string => {
    switch (question.type) {
      case 'multiple-choice':
        return `${String.fromCharCode(65 + question.correctAnswer)}. ${question.options[question.correctAnswer]}`;
      case 'true-false':
        return question.correctAnswer ? 'TRUE' : 'FALSE';
      case 'more-or-less':
        return question.correctAnswer === 0 ? question.option1 : question.option2;
      case 'numerical':
        return `${question.correctAnswer}${question.unit ? ' ' + question.unit : ''}`;
      default:
        return 'Unknown';
    }
  };

  const isAnswerCorrect = (vote: PlayerVote) => {
    if (question.type === 'numerical') {
      // Use provided range, or 10% of correct answer, with a minimum of 1
      const range = question.acceptableRange || Math.max(1, Math.abs(question.correctAnswer * 0.1));
      return typeof vote.answer === 'number' && 
        Math.abs(vote.answer - question.correctAnswer) <= range;
    }
    return vote.answer === question.correctAnswer;
  };

  return (
    <>
      {/* Correct Answer */}
      <div className="bg-green-100 dark:bg-green-500/20 border-2 border-green-400 dark:border-green-500/50 rounded-2xl p-6 mb-6">
        <p className="text-sm text-green-700 dark:text-green-300 mb-2">Correct Answer:</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{getCorrectAnswerDisplay()}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">{question.explanation}</p>
      </div>

      {/* Player Results */}
      <div className="space-y-3">
        {players.map((player) => {
          const vote = votes.find((v: PlayerVote) => v.playerId === player.id);
          const isCorrect = vote && isAnswerCorrect(vote);
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <div 
              key={player.id}
              className={`p-4 rounded-xl flex items-center justify-between
                ${isCorrect 
                  ? 'bg-green-100 dark:bg-green-500/20 border-2 border-green-400 dark:border-green-500/40' 
                  : 'bg-white/70 dark:bg-[#231942]/50 border border-purple-200/50 dark:border-purple-700/30'
                }
                ${isCurrentPlayer ? 'ring-2 ring-purple-500/50' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar user={player.discordUser} size={36} />
                <div>
                  <p className="font-medium">{getDisplayName(player.discordUser)}</p>
                  {vote && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Token {vote.token} • {isCorrect ? '+' + vote.token : 'missed'}
                    </p>
                  )}
                  {!vote && <p className="text-sm text-gray-400 dark:text-gray-500">No vote</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{player.score}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">pts</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
