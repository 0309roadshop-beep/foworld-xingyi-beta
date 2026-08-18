import L from 'leaflet'
import { useEffect } from 'react'
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { GeoCoords, Task } from '../../types'
import { formatDistance, getDistanceMeters } from '../../utils/geo'
import 'leaflet/dist/leaflet.css'

function createTaskIcon(type: Task['type'], status: Task['status']) {
  const isMain = type === 'main'
  const isLocked = status === 'locked'
  const color = isLocked ? '#5a7a8a' : isMain ? '#f5e06a' : '#2dd4a8'
  const glow = isLocked ? 'none' : `0 0 10px ${isMain ? '#f5e06a88' : '#2dd4a888'}`

  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="
        width:${isMain ? 18 : 14}px;height:${isMain ? 18 : 14}px;
        background:${color};
        border:2px solid ${isLocked ? '#4a4540' : '#fff3'};
        border-radius:50%;
        box-shadow:${glow};
        ${isMain && !isLocked ? 'animation:pulse 2s infinite;' : ''}
      "></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const playerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;
    background:#4ade80;
    border:3px solid #fff;
    border-radius:50%;
    box-shadow:0 0 12px #4ade8088;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function MapRecenter({
  center,
  selectedTaskId,
  tasks,
}: {
  center: [number, number]
  selectedTaskId?: string
  tasks: Task[]
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedTaskId) {
      const task = tasks.find((t) => t.id === selectedTaskId)
      if (task) {
        map.flyTo([task.coords.latitude, task.coords.longitude], 14, {
          duration: 0.8,
        })
        return
      }
    }
    map.flyTo(center, 13, { duration: 0.8 })
  }, [center, selectedTaskId, tasks, map])

  return null
}

interface TaskMapProps {
  playerCoords: GeoCoords
  tasks: Task[]
  selectedTaskId?: string
  onSelectTask?: (task: Task) => void
}

export function TaskMap({
  playerCoords,
  tasks,
  selectedTaskId,
  onSelectTask,
}: TaskMapProps) {
  const center: [number, number] = [
    playerCoords.latitude,
    playerCoords.longitude,
  ]

  const sideCount = tasks.filter(
    (t) => t.type === 'side' && t.status !== 'locked',
  ).length

  return (
    <div className="task-map relative h-[220px] w-full overflow-hidden rounded-2xl border border-jade/20">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <MapRecenter
          center={center}
          selectedTaskId={selectedTaskId}
          tasks={tasks}
        />

        {/* 玩家定位 */}
        <Marker position={center} icon={playerIcon}>
          <Popup>
            <span className="text-xs">你的位置</span>
          </Popup>
        </Marker>

        <Circle
          center={center}
          radius={playerCoords.accuracy ?? 200}
          pathOptions={{
            color: '#4ade80',
            fillColor: '#4ade80',
            fillOpacity: 0.08,
            weight: 1,
            dashArray: '4 4',
          }}
        />

        {/* 任务点位 */}
        {tasks.map((task) => {
          const dist = getDistanceMeters(playerCoords, task.coords)
          const pos: [number, number] = [
            task.coords.latitude,
            task.coords.longitude,
          ]

          return (
            <Marker
              key={task.id}
              position={pos}
              icon={createTaskIcon(task.type, task.status)}
              eventHandlers={{
                click: () => onSelectTask?.(task),
              }}
            >
              <Popup>
                <div className="min-w-[140px] text-xs">
                  <p className="mb-1 font-medium">
                    {task.type === 'main' ? '🌟 主线' : '📍 支线'}
                  </p>
                  <p className="mb-1 font-semibold">{task.title}</p>
                  <p className="text-gray-500">{formatDistance(dist)}</p>
                  {task.status === 'locked' && (
                    <p className="mt-1 text-gray-400">🔒 未解锁</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* 图例 */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] flex gap-2 rounded-lg bg-void-900/85 px-2 py-1.5 backdrop-blur-sm">
        <span className="flex items-center gap-1 text-[10px] text-mist-muted">
          <span className="h-2 w-2 rounded-full bg-spirit" />
          你
        </span>
        <span className="flex items-center gap-1 text-[10px] text-mist-muted">
          <span className="h-2 w-2 rounded-full bg-gold-glow" />
          主线
        </span>
        <span className="flex items-center gap-1 text-[10px] text-mist-muted">
          <span className="h-2 w-2 rounded-full bg-jade" />
          支线 ({sideCount})
        </span>
      </div>
    </div>
  )
}
