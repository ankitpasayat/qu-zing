import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { PowerUpSelector } from '../components/PowerUpSelector';
import type { PowerUp, PowerUpType, MultipleChoiceQuestion, TrueFalseQuestion } from '../types/game';

// Helper to create power-ups array
function createPowerUps(types: PowerUpType[]): PowerUp[] {
  return types.map((type) => ({
    type,
    used: false,
  }));
}

function createPowerUpsWithUsed(specs: { type: PowerUpType; used: boolean }[]): PowerUp[] {
  return specs.map(({ type, used }) => ({ type, used }));
}

// Mock questions
const mockMultipleChoiceQuestion: MultipleChoiceQuestion = {
  id: 'q1',
  type: 'multiple-choice',
  text: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctAnswer: 1,
  category: 'Math',
  difficulty: 'easy',
  explanation: 'Basic addition',
};

const mockTrueFalseQuestion: TrueFalseQuestion = {
  id: 'q2',
  type: 'true-false',
  text: 'The sky is blue',
  correctAnswer: true,
  category: 'General',
  difficulty: 'easy',
  explanation: 'The sky appears blue due to light scattering',
};

describe('PowerUpSelector Component', () => {
  const mockOnSelect = vi.fn();
  const mockOnRequest5050 = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all available power-ups', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down', 'safety-net', '50-50'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      expect(screen.getByText('2X')).toBeInTheDocument();
      expect(screen.getByText('Shield')).toBeInTheDocument();
      expect(screen.getByText('50/50')).toBeInTheDocument();
    });

    it('should show optional prompt', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      expect(screen.getByText(/Power-ups/i)).toBeInTheDocument();
      expect(screen.getByText(/optional/i)).toBeInTheDocument();
    });

    it('should render nothing when no power-ups available', () => {
      const { container } = render(
        <PowerUpSelector
          powerUps={[]}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should hide used power-ups', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUpsWithUsed([
            { type: 'double-down', used: true },
            { type: 'safety-net', used: false },
          ])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      expect(screen.queryByText('2X')).not.toBeInTheDocument();
      expect(screen.getByText('Shield')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicking an available power-up', async () => {
      const user = userEvent.setup();

      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down', 'safety-net'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      await user.click(screen.getByText('2X'));

      expect(mockOnSelect).toHaveBeenCalledWith('double-down');
    });

    it('should highlight selected power-up', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down', 'safety-net'])}
          selectedPowerUp="double-down"
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      const button = screen.getByText('2X').closest('button');
      expect(button?.className).toContain('animate-pulse-glow');
    });

    it('should deselect when clicking selected power-up', async () => {
      const user = userEvent.setup();

      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down'])}
          selectedPowerUp="double-down"
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      await user.click(screen.getByText('2X'));

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });

    it('should show description when power-up is selected', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down'])}
          selectedPowerUp="double-down"
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      expect(screen.getByText(/Double points if correct/)).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all power-ups when disabled prop is true', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down', 'safety-net'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={true}
        />
      );

      const doubleDownButton = screen.getByText('2X').closest('button');
      const safetyNetButton = screen.getByText('Shield').closest('button');
      
      expect(doubleDownButton).toBeDisabled();
      expect(safetyNetButton).toBeDisabled();
    });

    it('should not call onSelect when disabled', async () => {
      const user = userEvent.setup();

      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={true}
        />
      );

      await user.click(screen.getByText('2X'));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Power-up Icons', () => {
    it('should render correct icon for double-down', () => {
      const { container } = render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      // SVG icon is now used instead of emoji
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render correct icon for safety-net', () => {
      const { container } = render(
        <PowerUpSelector
          powerUps={createPowerUps(['safety-net'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      // SVG icon is now used instead of emoji
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render correct icon for 50-50', () => {
      const { container } = render(
        <PowerUpSelector
          powerUps={createPowerUps(['50-50'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      // SVG icon is now used instead of emoji
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('50/50 Power-up', () => {
    it('should allow 50/50 on multiple choice questions', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['50-50'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      const button = screen.getByText('50/50').closest('button');
      expect(button).not.toBeDisabled();
    });

    it('should disable 50/50 on non-multiple choice questions', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['50-50'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockTrueFalseQuestion}
          disabled={false}
        />
      );

      const button = screen.getByText('50/50').closest('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Only works on multiple choice');
    });

    it('should disable 50/50 if already used (eliminatedOptions present)', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['50-50'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
          eliminatedOptions={[0, 2]}
        />
      );

      const button = screen.getByText('50/50').closest('button');
      expect(button).toBeDisabled();
    });

    it('should show 50/50 active message when eliminatedOptions present', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
          eliminatedOptions={[0, 2]}
        />
      );

      expect(screen.getByText(/50\/50 active! 2 wrong answers removed/)).toBeInTheDocument();
    });

    it('should call onRequest5050 when selecting 50/50', async () => {
      const user = userEvent.setup();

      render(
        <PowerUpSelector
          powerUps={createPowerUps(['50-50'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
          onRequest5050={mockOnRequest5050}
        />
      );

      await user.click(screen.getByText('50/50'));

      expect(mockOnRequest5050).toHaveBeenCalled();
      expect(mockOnSelect).toHaveBeenCalledWith('50-50');
    });
  });

  describe('Tooltips', () => {
    it('should show tooltip for double-down', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['double-down'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      const button = screen.getByText('2X').closest('button');
      expect(button).toHaveAttribute('title', 'Double points if correct!');
    });

    it('should show tooltip for safety-net', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['safety-net'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      const button = screen.getByText('Shield').closest('button');
      expect(button).toHaveAttribute('title', 'Keep your token if wrong');
    });

    it('should show tooltip for 50-50', () => {
      render(
        <PowerUpSelector
          powerUps={createPowerUps(['50-50'])}
          selectedPowerUp={null}
          onSelect={mockOnSelect}
          question={mockMultipleChoiceQuestion}
          disabled={false}
        />
      );

      const button = screen.getByText('50/50').closest('button');
      expect(button).toHaveAttribute('title', 'Remove 2 wrong answers');
    });
  });
});
