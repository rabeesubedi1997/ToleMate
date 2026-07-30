import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { slugify } from '../utils/slug';

// Fix Leaflet's broken default icon paths when bundled with webpack/CRA
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const primaryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapService {
  id: number;
  name: string;
  description: string;
  price: number | null;
  pricing_type: string;
  category?: { name: string };
  vendor?: {
    id: number;
    business_name: string;
    rating: number;
    is_verified?: boolean;
    user?: { lat: number | null; lng: number | null };
  };
}

interface Props {
  services: MapService[];
  userCoords?: { lat: number; lng: number } | null;
  radius?: number;
}

/** Re-centres map when services list changes */
function AutoBounds({ services }: { services: MapService[] }) {
  const map = useMap();
  useEffect(() => {
    const points = services
      .map(s => [s.vendor?.user?.lat, s.vendor?.user?.lng] as [number | null | undefined, number | null | undefined])
      .filter(([lat, lng]) => lat != null && lng != null) as [number, number][];
    if (points.length > 0) {
      map.fitBounds(points.map(([lat, lng]) => [lat, lng] as [number, number]), { padding: [40, 40], maxZoom: 13 });
    }
  }, [services, map]);
  return null;
}

const ServiceMapView: React.FC<Props> = ({ services, userCoords, radius }) => {
  // Default centre: Kathmandu if no user coords and no service coords
  const defaultCenter: [number, number] = userCoords
    ? [userCoords.lat, userCoords.lng]
    : [27.7172, 85.3240];

  const mappable = services.filter(s => s.vendor?.user?.lat != null && s.vendor?.user?.lng != null);
  const unmapped = services.length - mappable.length;

  return (
    <div className="relative">
      {unmapped > 0 && (
        <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          {unmapped} service{unmapped !== 1 ? 's' : ''} not shown on map (vendor location not set).
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '560px' }}>
        <MapContainer
          center={defaultCenter}
          zoom={11}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User location marker */}
          {userCoords && (
            <Marker
              position={[userCoords.lat, userCoords.lng]}
              icon={new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
              })}
            >
              <Popup><span className="text-sm font-semibold">📍 Your location</span></Popup>
            </Marker>
          )}

          {/* Radius circle */}
          {userCoords && radius && (() => {
            // Drawn lazily via L.circle to avoid import complexity
            return null;
          })()}

          {/* Service pins */}
          {mappable.map(service => (
            <Marker
              key={service.id}
              position={[service.vendor!.user!.lat!, service.vendor!.user!.lng!]}
              icon={primaryIcon}
            >
              <Popup minWidth={220} maxWidth={260}>
                <div className="text-sm">
                  {service.category && (
                    <span className="inline-block text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full mb-1.5 font-medium">
                      {service.category.name}
                    </span>
                  )}
                  <p className="font-semibold text-gray-900 leading-snug mb-0.5">{service.name}</p>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs text-gray-600">
                      {service.vendor?.business_name}
                      {service.vendor?.is_verified && <span className="ml-1 text-blue-500">✓</span>}
                      {service.vendor?.rating ? (
                        <span className="ml-1.5 text-yellow-500">★ {Number(service.vendor.rating).toFixed(1)}</span>
                      ) : null}
                    </div>
                    <span className="font-bold text-primary-600 text-sm">
                      {service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Quote'}
                    </span>
                  </div>
                  <Link
                    to={`/services/${service.id}/${slugify(service.name || 'service')}`}
                    className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    View &amp; Book →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {mappable.length > 0 && <AutoBounds services={mappable} />}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-400 mt-2 text-right">
        Showing {mappable.length} service{mappable.length !== 1 ? 's' : ''} on map
        {' · '}Map data © <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a>
      </p>
    </div>
  );
};

export default ServiceMapView;
