import json
from typing import Dict, List, Set, Any
from fastapi import WebSocket
import logging

logger = logging.getLogger("clouddocs.websocket")

class ConnectionManager:
    def __init__(self):
        # project_id -> list of (websocket, user_id, user_name)
        self.project_connections: Dict[str, List[Dict[str, Any]]] = {}
        # user_id -> set of websockets
        self.user_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_project(self, websocket: WebSocket, project_id: str, user_id: str, user_name: str):
        await websocket.accept()
        if project_id not in self.project_connections:
            self.project_connections[project_id] = []
        self.project_connections[project_id].append({
            "ws": websocket,
            "user_id": user_id,
            "user_name": user_name
        })

        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

        # Broadcast updated presence to all members in the project
        await self.broadcast_presence(project_id)

    def disconnect_project(self, websocket: WebSocket, project_id: str, user_id: str):
        if project_id in self.project_connections:
            self.project_connections[project_id] = [
                conn for conn in self.project_connections[project_id]
                if conn["ws"] != websocket
            ]
            if not self.project_connections[project_id]:
                del self.project_connections[project_id]

        if user_id in self.user_connections and websocket in self.user_connections[user_id]:
            self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def broadcast_presence(self, project_id: str):
        if project_id not in self.project_connections:
            return
        
        # Unique online users
        online_users = {}
        for conn in self.project_connections[project_id]:
            uid = conn["user_id"]
            if uid not in online_users:
                online_users[uid] = {
                    "user_id": uid,
                    "name": conn["user_name"],
                    "status": "online"
                }

        payload = {
            "type": "presence",
            "project_id": project_id,
            "users": list(online_users.values())
        }
        await self.broadcast_to_project(project_id, payload)

    async def broadcast_to_project(self, project_id: str, message: Dict[str, Any]):
        if project_id not in self.project_connections:
            return
        
        dead_connections = []
        msg_str = json.dumps(message)
        for conn in self.project_connections[project_id]:
            ws: WebSocket = conn["ws"]
            try:
                await ws.send_text(msg_str)
            except Exception:
                dead_connections.append(conn)

        for dead in dead_connections:
            self.project_connections[project_id].remove(dead)

    async def send_personal_message(self, user_id: str, message: Dict[str, Any]):
        if user_id not in self.user_connections:
            return
        dead_ws = []
        msg_str = json.dumps(message)
        for ws in self.user_connections[user_id]:
            try:
                await ws.send_text(msg_str)
            except Exception:
                dead_ws.append(ws)

        for dead in dead_ws:
            self.user_connections[user_id].remove(dead)

ws_manager = ConnectionManager()
