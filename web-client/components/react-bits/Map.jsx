import React from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
} from "@/components/map";

const locations = [
  {
    id: 1,
    name: "กองบริการการศึกษา มหาวิทยาลัยนเรศวร",
    longitude: 100.1927497,
    latitude: 16.7466706,
    zoom: 15,
  },
];

const QSMap = ({ className = "" }) => {
  return (
    // รับ className เข้ามาเพื่อปรับขนาดจากภายนอกได้ง่าย
    <div className={`relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-md ${className}`}>
      <Map 
        center={[100.19299737246324, 16.746017017020755]} 
        zoom={15}
        // เพิ่ม pitch ให้แผนที่ดูมีมิติ 3D นิดหน่อย (Optional)
        pitch={45} 
      >
        {locations.map((location) => (
          <MapMarker
            key={location.id}
            longitude={location.longitude}
            latitude={location.latitude}
          >
            <MarkerContent>
              {/* ปรับสีหมุดให้เป็นสีส้ม (orange-500) เพื่อให้เข้ากับธีมเว็บ */}
              <div className="size-4 rounded-full bg-orange-500 border-2 border-white shadow-lg animate-bounce" />
              {/* เพิ่มวงแหวน pulse รอบๆ หมุด */}
              <div className="absolute -inset-2 bg-orange-500/30 rounded-full animate-ping pointer-events-none"></div>
            </MarkerContent>
            
            <MarkerTooltip>
                <span className="font-sans text-sm">{location.name}</span>
            </MarkerTooltip>
            
            <MarkerPopup>
              <div className="space-y-1 min-w-[200px] p-2">
                <p className="font-bold text-slate-800 text-sm">{location.name}</p>
                <p className="text-xs text-slate-500">
                  Lat: {location.latitude.toFixed(4)}, Long: {location.longitude.toFixed(4)}
                </p>
                <div className="mt-2 text-xs text-orange-600 font-medium">
                    อาคาร QS (อาคารเฉลิมพระเกียรติ 72 พรรษา)
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
};

export default QSMap;