import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
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
  });

  describe('Menu Mode', () => {
    it('should render main menu with create and join buttons', () => {
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      expect(screen.getByText('🎮 Create Lobby')).toBeInTheDocument();
      expect(screen.getByText('🚀 Join Lobby')).toBeInTheDocument();
    });

    it('should render game title and description', () => {
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      expect(screen.getByText('Test what you know. Win with confidence.')).toBeInTheDocument();
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
      
      await user.click(screen.getByText('🎮 Create Lobby'));
      
      // Button text also contains "Create Lobby", so check for the input and form
      expect(screen.getByPlaceholderText('Enter your name...')).toBeInTheDocument();
      expect(screen.getByText('Your Username')).toBeInTheDocument();
    });

    it('should have back button in create mode', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByText('🎮 Create Lobby'));
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should call onCreateLobby with username when submitting', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByText('🎮 Create Lobby'));
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'TestPlayer');
      
      // Find the submit button (it's the one with "Create Lobby" text after the heading)
      const buttons = screen.getAllByRole('button');
      const createButton = buttons.find(btn => btn.textContent === 'Create Lobby');
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
      
      await user.click(screen.getByText('🎮 Create Lobby'));
      
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
      
      await user.click(screen.getByText('🎮 Create Lobby'));
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
      
      await user.click(screen.getByText('🚀 Join Lobby'));
      
      expect(screen.getByText('Join Lobby')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ABC123')).toBeInTheDocument();
    });

    it('should validate lobby code format', async () => {
      const user = userEvent.setup();
      render(
        <BrowserLobby
          onCreateLobby={mockOnCreateLobby}
          onJoinLobby={mockOnJoinLobby}
        />
      );
      
      await user.click(screen.getByText('🚀 Join Lobby'));
      await user.type(screen.getByPlaceholderText('ABC123'), 'AB12');
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'Player');
      
      const joinButtons = screen.getAllByRole('button');
      const joinButton = joinButtons.find(btn => btn.textContent?.includes('Join Lobby'));
      
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
      
      await user.click(screen.getByText('🚀 Join Lobby'));
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
      
      await user.click(screen.getByText('🚀 Join Lobby'));
      await user.type(screen.getByPlaceholderText('ABC123'), 'XYZ789');
      await user.type(screen.getByPlaceholderText('Enter your name...'), 'JoinPlayer');
      
      const joinButtons = screen.getAllByRole('button');
      const joinButton = joinButtons.find(btn => btn.textContent?.includes('Join Lobby'));
      await user.click(joinButton!);
      
      expect(mockOnJoinLobby).toHaveBeenCalledWith('XYZ789', 'JoinPlayer');
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
    
    expect(screen.getByText('Click code to copy')).toBeInTheDocument();
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
    
    expect(await screen.findByText('✓ Code copied!')).toBeInTheDocument();
  });

  it('should render compact version', () => {
    render(<LobbyCodeDisplay lobbyCode="ABC123" compact />);
    
    expect(screen.getByText('Code:')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });
});
