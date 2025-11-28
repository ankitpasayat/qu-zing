import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test-utils';
import userEvent from '@testing-library/user-event';
import { BrowserLobby, LobbyCodeDisplay } from '../components/BrowserLobby';

// Mock the platform module
vi.mock('../lib/platform', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

describe('BrowserLobby Component', () => {
  const mockOnCreateLobby = vi.fn();
  const mockOnJoinLobby = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn().mockReturnValue(null);
    localStorage.setItem = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Menu Mode', () => {
    it('should render main menu with create and join buttons', () => {
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      // Buttons now have emoji + text format with spans
      expect(screen.getByRole('button', { name: /create lobby/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join lobby/i })).toBeInTheDocument();
    });

    it('should render game title and description', () => {
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      expect(screen.getByText(/Test what you know. Win with confidence!/i)).toBeInTheDocument();
    });

    it('should show how to play section', () => {
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      expect(screen.getByText('⚡ How to Play')).toBeInTheDocument();
    });
  });

  describe('Create Mode', () => {
    it('should switch to create mode when clicking create button', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /create lobby/i }));
      
      // Check for the input and heading
      expect(screen.getByPlaceholderText('Enter your name...')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Create Lobby/i })).toBeInTheDocument();
    });

    it('should have back button in create mode', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /create lobby/i }));
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should return to menu when clicking back button', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /create lobby/i }));
      expect(screen.getByRole('heading', { name: /Create Lobby/i })).toBeInTheDocument();
      
      await user.click(screen.getByText('Back'));
      expect(screen.getByRole('button', { name: /create lobby/i })).toBeInTheDocument();
    });

    it('should call onCreateLobby with username when submitting', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /create lobby/i }));
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'TestPlayer');
      
      // Find the submit button (it's the one with "Create Lobby" text after the heading)
      const buttons = screen.getAllByRole('button');
      const createButton = buttons.find(btn => btn.textContent?.includes('Create Lobby') && !btn.textContent?.includes('Back'));
      await user.click(createButton!);
      
      expect(mockOnCreateLobby).toHaveBeenCalledWith('TestPlayer');
    });

    it('should pre-fill username from localStorage', async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({ id: 'test', username: 'SavedUser' })
      );
      
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /create lobby/i }));
      
      expect(screen.getByPlaceholderText('Enter your name...')).toHaveValue('SavedUser');
    });

    it('should limit username to 20 characters', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /create lobby/i }));
      const input = screen.getByPlaceholderText('Enter your name...');
      
      await user.type(input, 'a'.repeat(25));
      
      expect(input).toHaveValue('a'.repeat(20));
    });
  });

  describe('Join Mode', () => {
    it('should switch to join mode when clicking join button', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      
      expect(screen.getByRole('heading', { name: /Join Lobby/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ABC123')).toBeInTheDocument();
    });

    it('should return to menu when clicking back button in join mode', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      expect(screen.getByText(/Enter the lobby code to join/i)).toBeInTheDocument();
      
      await user.click(screen.getByText('Back'));
      expect(screen.getByRole('button', { name: /join lobby/i })).toBeInTheDocument();
    });

    it('should validate lobby code format', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      await user.type(screen.getByPlaceholderText('ABC123'), 'AB12');
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'Player');
      
      const joinButtons = screen.getAllByRole('button');
      const joinButton = joinButtons.find(btn => btn.textContent?.includes('Join Lobby') && !btn.textContent?.includes('Back'));
      
      expect(joinButton).toBeDisabled();
    });

    it('should uppercase lobby code input', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      const input = screen.getByPlaceholderText('ABC123');
      
      await user.type(input, 'abc123');
      
      expect(input).toHaveValue('ABC123');
    });

    it('should call onJoinLobby with code and username', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      await user.type(screen.getByPlaceholderText('ABC123'), 'XYZ789');
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'JoinPlayer');
      
      const joinButtons = screen.getAllByRole('button');
      const joinButton = joinButtons.find(btn => btn.textContent?.includes('Join Lobby') && !btn.textContent?.includes('Back'));
      await user.click(joinButton!);
      
      expect(mockOnJoinLobby).toHaveBeenCalledWith('XYZ789', 'JoinPlayer');
    });

    it('should display error message when join fails with Error object', async () => {
      const user = userEvent.setup();
      mockOnJoinLobby.mockRejectedValue(new Error('Lobby not found'));
      
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      await user.type(screen.getByPlaceholderText('ABC123'), 'BADCODE');
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'Player');
      
      const joinButtons = screen.getAllByRole('button');
      const joinButton = joinButtons.find(btn => btn.textContent?.includes('Join Lobby') && !btn.textContent?.includes('Back'));
      await user.click(joinButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Lobby not found')).toBeInTheDocument();
      });
    });

    it('should display generic error message when join fails with non-Error', async () => {
      const user = userEvent.setup();
      mockOnJoinLobby.mockRejectedValue('Unknown error');
      
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      await user.type(screen.getByPlaceholderText('ABC123'), 'BADCODE');
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'Player');
      
      const joinButtons = screen.getAllByRole('button');
      const joinButton = joinButtons.find(btn => btn.textContent?.includes('Join Lobby') && !btn.textContent?.includes('Back'));
      await user.click(joinButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to join lobby')).toBeInTheDocument();
      });
    });

    it('should display error for invalid lobby code format', async () => {
      const user = userEvent.setup();
      
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /join lobby/i }));
      await user.type(screen.getByPlaceholderText('ABC123'), 'AB!@#$');
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'Player');
      
      // Need to enable the button by making the code 6 characters
      const codeInput = screen.getByPlaceholderText('ABC123');
      await user.clear(codeInput);
      await user.type(codeInput, 'ABC12!'); // 6 chars but with special char
      
      const joinButtons = screen.getAllByRole('button');
      const joinButton = joinButtons.find(btn => btn.textContent?.includes('Join Lobby') && !btn.textContent?.includes('Back'));
      await user.click(joinButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Lobby code must be exactly 6 characters (letters and numbers)')).toBeInTheDocument();
      });
    });
  });

  describe('Create Error Handling', () => {
    it('should handle error when onCreateLobby fails', async () => {
      const user = userEvent.setup();
      mockOnCreateLobby.mockRejectedValue(new Error('Server error'));
      
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /create lobby/i }));
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'TestPlayer');
      
      const buttons = screen.getAllByRole('button');
      const createButton = buttons.find(btn => btn.textContent?.includes('Create Lobby') && !btn.textContent?.includes('Back'));
      await user.click(createButton!);
      
      await waitFor(() => {
        // Should be in loading state initially, then fail
        expect(mockOnCreateLobby).toHaveBeenCalledWith('TestPlayer');
        expect(console.error).toHaveBeenCalled();
      });
    });
  });
});

describe('LobbyCodeDisplay Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display lobby code', () => {
    render(<LobbyCodeDisplay lobbyCode="ABC123" />);
    
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('should show click to copy text', () => {
    render(<LobbyCodeDisplay lobbyCode="XYZ789" />);
    
    expect(screen.getByText(/Click code to copy/i)).toBeInTheDocument();
  });

  it('should copy code when clicked', async () => {
    const { copyToClipboard } = await import('../lib/platform');
    const user = userEvent.setup();
    
    render(<LobbyCodeDisplay lobbyCode="TEST01" />);
    
    await user.click(screen.getByText('TEST01'));
    
    expect(copyToClipboard).toHaveBeenCalledWith('TEST01');
  });

  it('should show copied confirmation', async () => {
    const user = userEvent.setup();
    
    render(<LobbyCodeDisplay lobbyCode="COPY01" />);
    
    await user.click(screen.getByText('COPY01'));
    
    expect(await screen.findByText(/Code copied!/i)).toBeInTheDocument();
  });

  it('should render compact version', () => {
    render(<LobbyCodeDisplay lobbyCode="ABC123" compact />);
    
    // Compact version shows the code and copy icon
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });
});
