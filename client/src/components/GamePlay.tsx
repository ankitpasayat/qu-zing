import { useState, useEffect, useRef } from 'react';
import type { GameSession, Player, Question, PlayerVote, PowerUpType } from '../types/game';
import { getDisplayName, getAvailableTokens, canActivateGambit } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { TokenSelector } from './TokenSelector';
import { TokenTrading } from './TokenTrading';
import { PowerUpSelector } from './PowerUpSelector';
import { GameControls } from './GameControls';
import { GambitPrompt, GambitStatus } from './GambitPrompt';
import { StreakIndicator, StreakBadge } from './StreakIndicator';
import { useSoundEffects, type SoundType } from '../hooks/useSoundEffects';
import { copyToClipboard } from '../lib/platform';

// Countdown Timer Component - Fun game style
function CountdownTimer({ 
  duration, 
  startedAt,
  onComplete, 
  label = "Time remaining",
  playSound
}: { 
  duration: number;
  startedAt?: number | null; // Server timestamp when timer started
  onComplete: () => void; 
  label?: string;
  playSound?: (type: 'countdown' | 'countdownFinal') => void;
}) {
  // Calculate initial time left based on server sync (use function to defer Date.now() call)
  const [timeLeft, setTimeLeft] = useState(() => {
    if (startedAt) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      return Math.max(0, duration - elapsed);
    }
    return duration;
  });
  // Initialize progress based on elapsed time to sync with timer
  const [progress, setProgress] = useState(() => {
    if (startedAt) {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, duration * 1000 - elapsed);
      return (remaining / (duration * 1000)) * 100;
    }
    return 100;
  });
  const onCompleteRef = useRef(onComplete);
  const startTimeRef = useRef<number>(0);
  const lastSoundTimeRef = useRef<number>(-1);
  
  // Keep the ref updated with the latest callback
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Use server time if available, otherwise use client time
    startTimeRef.current = startedAt || Date.now();
    let completed = false;
    
    // Reset progress immediately when effect runs
    const initialElapsed = Date.now() - startTimeRef.current;
    const initialRemaining = Math.max(0, duration * 1000 - initialElapsed);
    const initialProgress = (initialRemaining / (duration * 1000)) * 100;
    setProgress(initialProgress);
    setTimeLeft(Math.max(0, Math.ceil(initialRemaining / 1000)));
    
    // Update both progress bar and time display in a single interval for sync
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remainingMs = Math.max(0, duration * 1000 - elapsed);
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      const newProgress = (remainingMs / (duration * 1000)) * 100;
      
      setProgress(newProgress);
      setTimeLeft(remainingSec);
      
      // Play countdown sounds for last 3 seconds
      if (playSound && remainingSec <= 3 && remainingSec > 0 && lastSoundTimeRef.current !== remainingSec) {
        lastSoundTimeRef.current = remainingSec;
        playSound(remainingSec === 1 ? 'countdownFinal' : 'countdown');
      }
      
      if (remainingMs <= 0) {
        clearInterval(interval);
        if (!completed) {
          completed = true;
          // Delay callback slightly to ensure 0 is displayed
          setTimeout(() => onCompleteRef.current(), 100);
        }
      }
    }, 16); // ~60fps for smooth progress bar animation

    return () => {
      clearInterval(interval);
      completed = true; // Prevent callback if component unmounts
    };
  }, [duration, startedAt, playSound]);

  // Calculate color based on progress (100% = green, 0% = red)
  const getProgressColor = (progressPercent: number) => {
    // Green RGB: 34, 197, 94
    // Yellow RGB: 250, 204, 21
    // Red RGB: 239, 68, 68
    const t = 1 - progressPercent / 100;
    
    let r, g, b;
    if (t < 0.5) {
      // Green to Yellow
      const localT = t * 2;
      r = Math.round(34 + (250 - 34) * localT);
      g = Math.round(197 + (204 - 197) * localT);
      b = Math.round(94 + (21 - 94) * localT);
    } else {
      // Yellow to Red
      const localT = (t - 0.5) * 2;
      r = Math.round(250 + (239 - 250) * localT);
      g = Math.round(204 + (68 - 204) * localT);
      b = Math.round(21 + (68 - 21) * localT);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const progressColor = getProgressColor(progress);
  const isUrgent = timeLeft <= 3;

  return (
    <div className="w-full max-w-sm mt-6 mx-auto">
      <div className="text-center mb-2">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div 
          className={`text-5xl font-black mt-1 transition-transform ${isUrgent ? 'animate-countdown-urgent' : ''}`}
          style={{ 
            color: progressColor,
            textShadow: isUrgent ? `0 0 20px ${progressColor}` : 'none'
          }}
        >
          {timeLeft}
        </div>
      </div>
      <div 
        className="w-full h-4 rounded-full overflow-hidden border-3 border-gray-800 dark:border-white"
        style={{ 
          background: 'var(--bg-secondary)',
          boxShadow: '3px 3px 0 var(--text-primary)'
        }}
      >
        <div 
          className="h-full transition-all duration-100 rounded-full"
          style={{ 
            width: `${progress}%`, 
            background: `linear-gradient(90deg, ${progressColor}, ${getProgressColor(Math.max(0, progress - 30))})` 
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
  onSubmitVote: (answer: number | boolean, token: number, powerUpUsed?: PowerUpType | null, eliminatedOptions?: number[] | null) => void;
  onAutoVote?: (playerId: string) => void;
  onExitGame?: () => void;
  onRequest5050?: () => Promise<number[] | null>;
  onActivateGambit?: () => void;
  onTradeUp?: (sourceValue: number) => void;
  onTradeDown?: (sourceValue: number) => void;
}

export function GamePlay({ 
  session, 
  currentPlayer, 
  isHost, 
  onChangePhase, 
  onSubmitVote,
  onAutoVote,
  onExitGame,
  onRequest5050,
  onActivateGambit,
  onTradeUp,
  onTradeDown
}: GamePlayProps) {
  const { playSound } = useSoundEffects();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showGambitPrompt, setShowGambitPrompt] = useState(false);
  const [hasDeclinedGambit, setHasDeclinedGambit] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  // Track question/phase to reset selections
  const questionPhaseKey = `${session.currentQuestion?.id || 'no-q'}-${session.currentPhase}`;
  const [lastResetKey, setLastResetKey] = useState(questionPhaseKey);
  const [selectedAnswer, setSelectedAnswer] = useState<number | boolean | null>(null);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUpType | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[] | null>(null);

  // Reset selections when question/phase changes (but only if not a spectator)
  // Spectators shouldn't have their state reset since they can't vote anyway
  if (lastResetKey !== questionPhaseKey && !currentPlayer.isSpectator) {
    setLastResetKey(questionPhaseKey);
    setSelectedAnswer(null);
    setSelectedToken(null);
    setSelectedPowerUp(null);
    setEliminatedOptions(null);
  }
  
  const { currentPhase, currentQuestion, currentRound, totalRounds, votes, players } = session;
  const hasVoted = votes.some((v: PlayerVote) => v.playerId === currentPlayer.id);
  
  // Check spectator status - also verify player is in spectators array (handles promotion transition)
  // During the brief moment of promotion, isSpectator flag might be stale
  const isInSpectatorsArray = session.spectators?.some(s => s.id === currentPlayer.id) ?? false;
  const isSpectator = currentPlayer.isSpectator || isInSpectatorsArray;
  
  const isBrowserMode = session.platform === 'browser';

  const handleCopyCode = async () => {
    const success = await copyToClipboard(session.channelId);
    if (success) {
      setCodeCopied(true);
      playSound('ding');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Show gambit prompt at 3rd-to-last round if player is eligible
  // Track the round where we last checked to prevent showing multiple times
  const lastCheckedRound = useRef<number | null>(null);
  
  useEffect(() => {
    const canShowGambit = 
      canActivateGambit(currentRound, totalRounds) &&
      !currentPlayer.gambit?.isActive &&
      !hasDeclinedGambit &&
      !isSpectator &&
      currentPhase === 'question';
    
    // Only show prompt if conditions are met and we haven't already checked this round
    if (canShowGambit && lastCheckedRound.current !== currentRound) {
      lastCheckedRound.current = currentRound;
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setShowGambitPrompt(true);
      });
    }
  }, [currentRound, totalRounds, currentPlayer.gambit, hasDeclinedGambit, isSpectator, currentPhase]);

  const handleActivateGambit = () => {
    setShowGambitPrompt(false);
    playSound('spring'); // Goofy spring sound for gambit activation
    setTimeout(() => playSound('rimshot'), 150); // Add a rimshot for dramatic effect
    onActivateGambit?.();
  };

  const handleDismissGambit = () => {
    setShowGambitPrompt(false);
    setHasDeclinedGambit(true);
  };

  const handleSubmit = () => {
    if (selectedAnswer !== null && selectedToken !== null && !hasVoted) {
      playSound('pop'); // Satisfying pop for vote submission
      onSubmitVote(selectedAnswer, selectedToken, selectedPowerUp, eliminatedOptions);
    }
  };

  // Handle 50/50 power-up request
  const handle5050Request = async () => {
    if (onRequest5050 && !eliminatedOptions) {
      playSound('kazoo'); // Goofy kazoo for token trade
      const options = await onRequest5050();
      if (options) {
        setEliminatedOptions(options);
        setSelectedPowerUp('50-50');
      }
    }
  };

  // Handle answer selection with animation and sound
  const handleAnswerSelect = (answer: number | boolean) => {
    playSound('whoosh'); // Whoosh for 50-50 elimination
    setSelectedAnswer(answer);
  };

  const handleVotingTimeout = () => {
    // Auto-submit for current player if they haven't voted
    if (!hasVoted && !isSpectator && currentQuestion) {
      // Use selected values if available, otherwise use defaults
      const availableTokens = getAvailableTokens(currentPlayer.tokenCounts);
      const token = selectedToken !== null 
        ? selectedToken 
        : Math.min(...availableTokens);
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

  // Exit confirmation modal content - goofy style
  const exitConfirmModal = showExitConfirm && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="goofy-panel p-6 max-w-sm w-full animate-pop-in" style={{ transform: 'rotate(-1deg)' }}>
        <h3 className="text-xl font-black mb-3 text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-2xl">🚪</span> Exit Game?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
          {isSoloMode 
            ? "Are you sure you want to end your solo game? Your progress will be lost."
            : "Are you sure you want to leave the game? You can rejoin later if the game is still in progress."
          }
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExitConfirm(false)}
            className="comic-button-secondary flex-1 py-3 px-4 rounded-xl"
          >
            Stay
          </button>
          <button
            onClick={() => {
              setShowExitConfirm(false);
              onExitGame?.();
            }}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold rounded-xl border-3 border-gray-800 dark:border-white shadow-[3px_3px_0_#2d1b4e] dark:shadow-[3px_3px_0_#f8f5ff] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px]"
          >
            Exit
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
        <div className="min-h-screen flex flex-col p-4 pt-16 safe-area-inset bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
          {exitConfirmModal}
          <GameControls 
            showExitButton
            onExit={() => setShowExitConfirm(true)}
            lobbyCode={isBrowserMode ? session.channelId : undefined}
            onCopyCode={handleCopyCode}
            codeCopied={codeCopied}
          />
          
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full text-center">
            <div className="text-6xl mb-6 animate-bounce-happy">🎮</div>
            <h2 className="text-2xl md:text-3xl font-black mb-3 bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              You're In!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 font-medium">
              A round is currently in progress. You'll join the action on the next question!
            </p>
            
            <div className="w-full goofy-panel p-6 mb-6" style={{ transform: 'rotate(-1deg)' }}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Game Progress</span>
                <span className="text-sm font-bold px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 border-2 border-gray-800 dark:border-white rounded-full text-gray-800">
                  {currentQuestion.category}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-4xl font-black text-purple-600 dark:text-purple-400">{currentRound}</span>
                <span className="text-gray-400 dark:text-gray-500 text-xl">/</span>
                <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">{totalRounds}</span>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">questions completed</p>
            </div>
            
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold">Waiting for current round to finish...</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col p-4 pt-16 safe-area-inset bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
        {exitConfirmModal}
        {/* Gambit Prompt Modal */}
        {showGambitPrompt && (
          <GambitPrompt
            player={currentPlayer}
            currentRound={currentRound}
            totalRounds={totalRounds}
            onActivate={handleActivateGambit}
            onDismiss={handleDismissGambit}
          />
        )}
        <GameControls 
          showExitButton
          onExit={() => setShowExitConfirm(true)}
          lobbyCode={isBrowserMode ? session.channelId : undefined}
          onCopyCode={handleCopyCode}
          codeCopied={codeCopied}
        />
        
        <div className="mb-4">
          <h2 className="text-center text-xl md:text-2xl font-black mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent animate-pop-in">
            📖 Next Question
          </h2>
          <Header round={currentRound} totalRounds={totalRounds} category={currentQuestion.category} />
          {/* Streak Indicator */}
          {currentPlayer.streak.current >= 2 && (
            <div className="flex justify-center mt-3">
              <StreakIndicator streak={currentPlayer.streak} gambit={currentPlayer.gambit} />
            </div>
          )}
          {/* Gambit Status */}
          {currentPlayer.gambit?.isActive && (
            <div className="flex justify-center mt-2">
              <GambitStatus gambit={currentPlayer.gambit} />
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <QuestionDisplay question={currentQuestion} />
          
          <CountdownTimer
            key={`question-${currentRound}`}
            duration={session.settings.timeBetweenQuestions}
            startedAt={session.questionPhaseStartedAt}
            onComplete={isHost ? () => onChangePhase('voting') : () => {}}
            label="Starting in"
            playSound={playSound}
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
        <div className="min-h-screen flex flex-col p-4 pt-16 safe-area-inset bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
          {exitConfirmModal}
          <GameControls 
            showExitButton
            onExit={() => setShowExitConfirm(true)}
            lobbyCode={isBrowserMode ? session.channelId : undefined}
            onCopyCode={handleCopyCode}
            codeCopied={codeCopied}
          />
          
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full text-center">
            <div className="text-6xl mb-6 animate-pulse-slow">⏳</div>
            <h2 className="text-2xl md:text-3xl font-black mb-3 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Round in Progress
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 font-medium">
              Players are answering the current question. Get ready for the next one!
            </p>
            
            <div className="w-full goofy-panel p-6 mb-6" style={{ transform: 'rotate(0.5deg)' }}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Voting Progress</span>
                <span className="text-sm font-bold px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-400 border-2 border-gray-800 dark:border-white rounded-full text-gray-800">
                  {votes.length}/{activePlayers.length} voted
                </span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {activePlayers.map((player: Player) => {
                  const hasPlayerVoted = votes.some((v: PlayerVote) => v.playerId === player.id);
                  return (
                    <div 
                      key={player.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-800 dark:border-white shadow-[2px_2px_0_#2d1b4e] dark:shadow-[2px_2px_0_#f8f5ff] ${
                        hasPlayerVoted 
                          ? 'bg-green-200 dark:bg-green-500/30' 
                          : 'bg-gray-100 dark:bg-gray-800/50'
                      }`}
                    >
                      <PlayerAvatar user={player.discordUser} size={24} />
                      <span className="text-sm font-bold">{getDisplayName(player.discordUser)}</span>
                      {hasPlayerVoted && <span className="text-green-600 dark:text-green-400 font-bold">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
              Round {currentRound} of {totalRounds} • {currentQuestion.category}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex flex-col p-4 pt-16 pb-32 safe-area-inset bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
        {exitConfirmModal}
        <GameControls 
          showExitButton
          onExit={() => setShowExitConfirm(true)}
          lobbyCode={isBrowserMode ? session.channelId : undefined}
          onCopyCode={handleCopyCode}
          codeCopied={codeCopied}
        />
        
        <div className="mb-4 md:mb-6">
          <h2 className="text-center text-xl md:text-2xl font-black mb-3 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent animate-pop-in">
            🎯 Make Your Choice!
          </h2>
          <Header 
            round={currentRound} 
            totalRounds={totalRounds} 
            category={currentQuestion.category}
            votedCount={votes.length}
            totalPlayers={activePlayers.length}
          />
          {/* Streak Indicator */}
          {currentPlayer.streak.current >= 2 && (
            <div className="flex justify-center mt-3">
              <StreakIndicator streak={currentPlayer.streak} gambit={currentPlayer.gambit} />
            </div>
          )}
          {/* Gambit Status */}
          {currentPlayer.gambit?.isActive && (
            <div className="flex justify-center mt-2">
              <GambitStatus gambit={currentPlayer.gambit} />
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <QuestionDisplay question={currentQuestion} compact />
          
          <CountdownTimer
            key={`voting-${currentRound}`}
            duration={session.settings.timeToAnswer}
            startedAt={session.votingPhaseStartedAt}
            onComplete={handleVotingTimeout}
            label="Time to answer"
            playSound={playSound}
          />
          
          {hasVoted ? (
            <div className="mt-6 text-center p-6 goofy-panel bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 animate-pop-in" style={{ transform: 'rotate(1deg)' }}>
              <p className="text-green-700 dark:text-green-300 font-black text-lg flex items-center justify-center gap-2">
                <span className="text-2xl">✅</span> Vote Submitted!
              </p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400/70 mt-1">
                Waiting for others... ({votes.length}/{activePlayers.length})
              </p>
            </div>
          ) : (
            <>
              <AnswerOptions 
                question={currentQuestion} 
                selectedAnswer={selectedAnswer}
                onSelect={handleAnswerSelect}
                eliminatedOptions={eliminatedOptions}
              />
              
              <TokenSelector
                tokenCounts={currentPlayer.tokenCounts}
                selectedToken={selectedToken}
                onSelect={setSelectedToken}
                disabled={selectedAnswer === null}
              />
              
              {/* Token Trading - available during voting */}
              {onTradeUp && onTradeDown && (
                <div className="mt-4">
                  <TokenTrading
                    tokenCounts={currentPlayer.tokenCounts}
                    onTradeUp={onTradeUp}
                    onTradeDown={onTradeDown}
                    disabled={hasVoted}
                  />
                </div>
              )}
              
              <PowerUpSelector
                powerUps={currentPlayer.powerUps}
                selectedPowerUp={selectedPowerUp}
                onSelect={setSelectedPowerUp}
                question={currentQuestion}
                disabled={hasVoted}
                eliminatedOptions={eliminatedOptions}
                onRequest5050={handle5050Request}
              />
              
              <button
                onClick={handleSubmit}
                disabled={selectedAnswer === null || selectedToken === null}
                className="comic-button w-full mt-6 py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-lg"
                style={{ transform: 'rotate(-0.5deg)' }}
              >
                {selectedAnswer !== null && selectedToken !== null 
                  ? '🚀 Submit Vote!' 
                  : '👆 Select answer and token'}
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
      <div className="min-h-screen flex flex-col p-4 pt-16 pb-24 safe-area-inset bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
        {exitConfirmModal}
        <GameControls 
          showExitButton
          onExit={() => setShowExitConfirm(true)}
          lobbyCode={isBrowserMode ? session.channelId : undefined}
          onCopyCode={handleCopyCode}
          codeCopied={codeCopied}
        />
        
        <div className="mb-4">
          <h2 className="text-center text-xl md:text-2xl font-black mb-3 bg-gradient-to-r from-green-500 to-blue-500 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent animate-pop-in">
            🎉 The Answer!
          </h2>
          <Header round={currentRound} totalRounds={totalRounds} category={currentQuestion.category} />
        </div>
        
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <RevealDisplay 
            question={currentQuestion}
            votes={votes}
            players={players}
            currentPlayerId={currentPlayer.id}
            playSound={playSound}
          />
          
          <CountdownTimer
            key={`reveal-${currentRound}`}
            duration={session.settings.timeToViewAnswer}
            startedAt={session.revealPhaseStartedAt}
            onComplete={isHost ? () => onChangePhase('question') : () => {}}
            label={currentRound >= totalRounds ? 'Final results in' : 'Next question in'}
            playSound={playSound}
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
  onSelect,
  eliminatedOptions = null
}: { 
  question: Question; 
  selectedAnswer: number | boolean | null;
  onSelect: (answer: number | boolean) => void;
  eliminatedOptions?: number[] | null;
}) {
  if (question.type === 'multiple-choice') {
    return (
      <div className="mt-4 space-y-3">
        {question.options.map((option, index) => {
          const isEliminated = eliminatedOptions?.includes(index);
          return (
            <button
              key={index}
              onClick={() => !isEliminated && onSelect(index)}
              disabled={isEliminated}
              className={`w-full p-4 rounded-xl text-left font-medium transition-all
                ${isEliminated
                  ? 'opacity-40 cursor-not-allowed bg-gray-200 dark:bg-gray-800 line-through text-gray-500 dark:text-gray-600'
                  : selectedAnswer === index 
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white ring-2 ring-purple-400 shadow-lg' 
                    : 'bg-white/80 dark:bg-[#231942]/60 hover:bg-purple-50 dark:hover:bg-[#2d1f4e]/70 border border-purple-200/50 dark:border-purple-700/40'
                }`}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span>
              {option}
              {isEliminated && <span className="ml-2 text-red-500">✗</span>}
            </button>
          );
        })}
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
  currentPlayerId,
  playSound
}: { 
  question: Question;
  votes: PlayerVote[];
  players: Player[];
  currentPlayerId: string;
  playSound?: (type: SoundType) => void;
}) {
  const hasPlayedSoundRef = useRef(false);
  
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

  // Play sound for current player's result (only once)
  const currentPlayerVote = votes.find((v: PlayerVote) => v.playerId === currentPlayerId);
  const currentPlayerCorrect = currentPlayerVote && isAnswerCorrect(currentPlayerVote);
  
  useEffect(() => {
    if (playSound && currentPlayerVote && !hasPlayedSoundRef.current) {
      hasPlayedSoundRef.current = true;
      // Use goofier sounds for correct/wrong
      if (currentPlayerCorrect) {
        playSound('correct');
        // Add celebration sounds
        setTimeout(() => playSound('ding'), 150);
        setTimeout(() => playSound('boing'), 300);
      } else {
        playSound('wahwah'); // Sad trombone style
        setTimeout(() => playSound('bonk'), 200);
      }
    }
  }, [playSound, currentPlayerVote, currentPlayerCorrect]);

  return (
    <>
      {/* Correct Answer */}
      <div className="bg-green-100 dark:bg-green-500/20 border-2 border-green-400 dark:border-green-500/50 rounded-2xl p-6 mb-6 animate-pop-in">
        <p className="text-sm text-green-700 dark:text-green-300 mb-2">Correct Answer:</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{getCorrectAnswerDisplay()}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">{question.explanation}</p>
      </div>

      {/* Player Results */}
      <div className="space-y-3">
        {players.map((player, index) => {
          const vote = votes.find((v: PlayerVote) => v.playerId === player.id);
          const isCorrect = vote && isAnswerCorrect(vote);
          const isCurrentPlayer = player.id === currentPlayerId;

          return (
            <div 
              key={player.id}
              className={`p-4 rounded-xl flex items-center justify-between animate-slide-in-up
                ${isCorrect 
                  ? 'bg-green-100 dark:bg-green-500/20 border-2 border-green-400 dark:border-green-500/40' 
                  : 'bg-white/70 dark:bg-[#231942]/50 border border-purple-200/50 dark:border-purple-700/30'
                }
                ${isCurrentPlayer ? 'ring-2 ring-purple-500/50' : ''}
                ${isCurrentPlayer && isCorrect ? 'animate-bounce-happy' : ''}
                ${isCurrentPlayer && vote && !isCorrect ? 'animate-shake' : ''}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar user={player.discordUser} size={36} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{getDisplayName(player.discordUser)}</p>
                    <StreakBadge streak={player.streak} gambit={player.gambit} />
                    {player.gambit?.isActive && <GambitStatus gambit={player.gambit} />}
                  </div>
                  {vote && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Token {vote.token} • {isCorrect ? '+' + vote.token : 'missed'}
                    </p>
                  )}
                  {!vote && <p className="text-sm text-gray-400 dark:text-gray-500">No vote</p>}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${isCorrect && isCurrentPlayer ? 'animate-score-pop' : ''}`}>{player.score}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">pts</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
