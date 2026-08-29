-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "winnerId" TEXT,
    "carrotOwner" TEXT,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_playerId_key" ON "Session"("playerId");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX "Player_sessionId_key" ON "Player"("sessionId");
CREATE UNIQUE INDEX "Game_roomId_key" ON "Game"("roomId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
