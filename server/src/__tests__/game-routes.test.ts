import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import ioc from 'socket.io-client';
import gameRoutes, { setupSocketIO, broadcastUpdate } from '../routes/game.js';
import type { DiscordUser, GameSession } from '../types/game.js';

interface GameUpdateEvent {
  type: string;
  session: GameSession;
  timestamp: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketClient = any;

describe('Game Routes', () => {
  let app: express.Application;
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketIOServer;
  let clientSocket: SocketClient;
  let serverPort: number;

  const createUser = (id: string, username: string = 'TestUser'): DiscordUser => ({
    id,
    username,
    discriminator: '0',
    avatar: null,
    globalName: username,
    platform: 'browser',
  });

  const getUniqueChannelId = () => `channel-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  beforeAll((done) => {
    app = express();
    app.use(express.json());
    app.use('/api/game', gameRoutes);
    
    httpServer = createServer(app);
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });
    
    setupSocketIO(io);
    
    httpServer.listen(() => {
      const address = httpServer.address();
      if (address && typeof address !== 'string') {
        serverPort = address.port;
      }
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    io.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    clientSocket = ioc(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('broadcastUpdate', () => {
    it('should emit game:update event to room', (done) => {
      const channelId = getUniqueChannelId();
      const mockSession = { channelId } as GameSession;
      
      clientSocket.emit('game:join', {
        channelId,
        guildId: '',
        instanceId: '',
        user: createUser('user1'),
        platform: 'browser',
      }, () => {
        // Set up listener before triggering the event
        clientSocket.on('game:update', (data: GameUpdateEvent) => {
          if (data.type === 'test_event') {
            expect(data.type).toBe('test_event');
            expect(data.session).toEqual(mockSession);
            expect(data.timestamp).toBeDefined();
            done();
          }
        });
        
        // Trigger the test event
        broadcastUpdate(io, channelId, 'test_event', mockSession);
      });
    });
  });

  describe('Socket Events', () => {
    describe('game:join', () => {
      it('should successfully join a new session', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1', 'Player1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, (response: { success?: boolean; session?: GameSession; error?: string }) => {
          expect(response.success).toBe(true);
          expect(response.session).toBeDefined();
          expect(response.session?.channelId).toBe(channelId);
          expect(response.session?.players).toHaveLength(1);
          done();
        });
      });

      it('should return error for missing data', (done) => {
        clientSocket.emit('game:join', {
          channelId: null,
          user: null,
        }, (response: { error?: string }) => {
          expect(response.error).toBeDefined();
          done();
        });
      });

      it('should broadcast player_joined when second player joins', (done) => {
        const channelId = getUniqueChannelId();
        const user1 = createUser('user1');
        const user2 = createUser('user2');
        
        // First player joins
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user: user1,
          platform: 'browser',
        }, () => {
          // Create second client
          const client2 = ioc(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
            forceNew: true,
          });
          
          clientSocket.on('game:update', (data: GameUpdateEvent) => {
            if (data.type === 'player_joined') {
              expect(data.session.players).toHaveLength(2);
              client2.disconnect();
              done();
            }
          });
          
          client2.on('connect', () => {
            client2.emit('game:join', {
              channelId,
              guildId: '',
              instanceId: '',
              user: user2,
              platform: 'browser',
            }, () => {});
          });
        });
      });
    });

    describe('game:leave', () => {
      it('should leave session successfully', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:leave', {
            channelId,
            playerId: user.id,
          }, (response: { success?: boolean }) => {
            expect(response.success).toBe(true);
            done();
          });
        });
      });
    });

    describe('game:update_settings', () => {
      it('should update settings as host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:update_settings', {
            channelId,
            hostId: user.id,
            settings: { totalRounds: 15 },
          }, (response: { success?: boolean; session?: GameSession }) => {
            expect(response.success).toBe(true);
            expect(response.session?.settings.totalRounds).toBe(15);
            done();
          });
        });
      });

      it('should fail for non-host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:update_settings', {
            channelId,
            hostId: 'wrong-user',
            settings: { totalRounds: 15 },
          }, (response: { error?: string }) => {
            expect(response.error).toBeDefined();
            done();
          });
        });
      });
    });

    describe('game:start', () => {
      it('should start game as host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:start', {
            channelId,
            hostId: user.id,
          }, (response: { success?: boolean; session?: GameSession }) => {
            expect(response.success).toBe(true);
            expect(response.session?.currentPhase).toBe('question');
            done();
          });
        });
      }, 15000); // Increase timeout for question generation

      it('should fail to start as non-host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:start', {
            channelId,
            hostId: 'wrong-user',
          }, (response: { error?: string }) => {
            expect(response.error).toBeDefined();
            done();
          });
        });
      });
    });

    describe('game:vote', () => {
      it('should submit vote successfully', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:start', {
            channelId,
            hostId: user.id,
          }, () => {
            // Change to voting phase
            clientSocket.emit('game:change_phase', {
              channelId,
              hostId: user.id,
              phase: 'voting',
            }, () => {
              clientSocket.emit('game:vote', {
                channelId,
                playerId: user.id,
                answer: 0,
                token: 5,
              }, (response: { success?: boolean; session?: GameSession }) => {
                expect(response.success).toBe(true);
                expect(response.session?.votes).toHaveLength(1);
                done();
              });
            });
          });
        });
      }, 15000);
    });

    describe('game:auto_vote', () => {
      it('should auto-vote for player', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:start', {
            channelId,
            hostId: user.id,
          }, () => {
            clientSocket.emit('game:change_phase', {
              channelId,
              hostId: user.id,
              phase: 'voting',
            }, () => {
              clientSocket.emit('game:auto_vote', {
                channelId,
                playerId: user.id,
              }, (response: { success?: boolean; session?: GameSession }) => {
                expect(response.success).toBe(true);
                expect(response.session?.votes).toHaveLength(1);
                done();
              });
            });
          });
        });
      }, 15000);
    });

    describe('game:change_phase', () => {
      it('should change phase as host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:start', {
            channelId,
            hostId: user.id,
          }, () => {
            clientSocket.emit('game:change_phase', {
              channelId,
              hostId: user.id,
              phase: 'voting',
            }, (response: { success?: boolean; session?: GameSession }) => {
              expect(response.success).toBe(true);
              expect(response.session?.currentPhase).toBe('voting');
              done();
            });
          });
        });
      }, 15000);
    });

    describe('game:reset', () => {
      it('should reset game as host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:start', {
            channelId,
            hostId: user.id,
          }, () => {
            clientSocket.emit('game:reset', {
              channelId,
              hostId: user.id,
            }, (response: { success?: boolean; session?: GameSession }) => {
              expect(response.success).toBe(true);
              expect(response.session?.currentPhase).toBe('lobby');
              expect(response.session?.currentRound).toBe(0);
              done();
            });
          });
        });
      }, 15000);
    });

    describe('game:play_again', () => {
      it('should reset and start new game atomically as host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:start', {
            channelId,
            hostId: user.id,
          }, () => {
            clientSocket.emit('game:play_again', {
              channelId,
              hostId: user.id,
            }, (response: { success?: boolean; session?: GameSession }) => {
              expect(response.success).toBe(true);
              expect(response.session?.currentPhase).toBe('question');
              expect(response.session?.currentRound).toBe(1);
              expect(response.session?.players[0].score).toBe(0);
              done();
            });
          });
        });
      }, 15000);

      it('should fail for non-host', (done) => {
        const channelId = getUniqueChannelId();
        const user1 = createUser('user1');
        const user2 = createUser('user2');
        
        const client2 = ioc(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true,
        });
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user: user1,
          platform: 'browser',
        }, () => {
          client2.on('connect', () => {
            client2.emit('game:join', {
              channelId,
              guildId: '',
              instanceId: '',
              user: user2,
              platform: 'browser',
            }, () => {
              clientSocket.emit('game:start', {
                channelId,
                hostId: user1.id,
              }, () => {
                client2.emit('game:play_again', {
                  channelId,
                  hostId: user2.id,
                }, (response: { error?: string }) => {
                  expect(response.error).toBe('Failed to play again');
                  client2.disconnect();
                  done();
                });
              });
            });
          });
        });
      }, 15000);
    });

    describe('game:exit', () => {
      it('should exit game gracefully', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:exit', {
            channelId,
            playerId: user.id,
          }, (response: { success?: boolean; wasLastPlayer?: boolean }) => {
            expect(response.success).toBe(true);
            expect(response.wasLastPlayer).toBe(true);
            done();
          });
        });
      });
    });

    describe('game:cancel_generation', () => {
      it('should cancel generation as host', (done) => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user,
          platform: 'browser',
        }, () => {
          clientSocket.emit('game:cancel_generation', {
            channelId,
            hostId: user.id,
          }, (response: { success?: boolean; session?: GameSession }) => {
            expect(response.success).toBe(true);
            expect(response.session?.isGeneratingQuestions).toBe(false);
            done();
          });
        });
      });
    });

    describe('game:transfer_host', () => {
      it('should transfer host successfully', (done) => {
        const channelId = getUniqueChannelId();
        const user1 = createUser('user1');
        const user2 = createUser('user2');
        
        // Create second client
        const client2 = ioc(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true,
        });
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user: user1,
          platform: 'browser',
        }, () => {
          client2.on('connect', () => {
            client2.emit('game:join', {
              channelId,
              guildId: '',
              instanceId: '',
              user: user2,
              platform: 'browser',
            }, () => {
              clientSocket.emit('game:transfer_host', {
                channelId,
                currentHostId: user1.id,
                newHostId: user2.id,
              }, (response: { success?: boolean; session?: GameSession }) => {
                expect(response.success).toBe(true);
                expect(response.session?.hostId).toBe(user2.id);
                client2.disconnect();
                done();
              });
            });
          });
        });
      });
    });

    describe('disconnect handling', () => {
      it('should broadcast player_disconnected on socket disconnect', (done) => {
        const channelId = getUniqueChannelId();
        const user1 = createUser('user1');
        const user2 = createUser('user2');
        
        // Create second client
        const client2 = ioc(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true,
        });
        
        clientSocket.emit('game:join', {
          channelId,
          guildId: '',
          instanceId: '',
          user: user1,
          platform: 'browser',
        }, () => {
          client2.on('connect', () => {
            client2.emit('game:join', {
              channelId,
              guildId: '',
              instanceId: '',
              user: user2,
              platform: 'browser',
            }, () => {
              clientSocket.on('game:update', (data: GameUpdateEvent) => {
                if (data.type === 'player_disconnected') {
                  expect(data.session.players.find((p: { id: string }) => p.id === user2.id)?.isConnected).toBe(false);
                  done();
                }
              });
              
              // Disconnect second client
              client2.disconnect();
            });
          });
        });
      });
    });
  });

  describe('REST Endpoints', () => {
    describe('POST /api/game/join', () => {
      it('should join session via REST', async () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        const response = await fetch(`http://localhost:${serverPort}/api/game/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            guildId: '',
            instanceId: '',
            user,
            platform: 'browser',
          }),
        });
        
        const data = await response.json() as { success: boolean; session: GameSession };
        
        expect(response.ok).toBe(true);
        expect(data.success).toBe(true);
        expect(data.session).toBeDefined();
      });

      it('should return 400 for missing data', async () => {
        const response = await fetch(`http://localhost:${serverPort}/api/game/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        
        expect(response.status).toBe(400);
      });
    });
  });
});
