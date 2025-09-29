import { useState, useEffect } from "react";
import axios from "axios";
import { useCookies } from "react-cookie";
import AlertBellDropdown from "./AlertBellDropdown";

// Reuse your alert logic!
function generateAlertsFromAllDevices(allDevicesSensorData) {
    const alerts = [];
    Object.entries(allDevicesSensorData || {}).forEach(([deviceId, sensorData]) => {
        Object.keys(sensorData).forEach(paramName => {
            const series = sensorData[paramName]?.series || [];
            if (!series.length) return;
            const last = series[series.length - 1];

            if (paramName === "temperature" && last.value > 35) {
                alerts.push({
                    id: `temp-high-${deviceId}`,
                    title: "High Temperature",
                    message: `Device ${deviceId}: Temperature is too high (${last.value}°C)`,
                    severity: "critical",
                    createdAt: last.timestamp
                });
            }
            if (paramName === "humidity" && last.value > 80) {
                alerts.push({
                    id: `hum-high-${deviceId}`,
                    title: "High Humidity",
                    message: `Device ${deviceId}: Humidity is too high (${last.value}%)`,
                    severity: "warning",
                    createdAt: last.timestamp
                });
            }
        });
    });
    return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default function UserDeviceAlerts() {
    const [cookies] = useCookies(['token']);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUserDeviceAlerts() {
            setLoading(true);
            try {
                // 1. Get user's assigned devices
                const userRes = await axios.get('/api/users/me', {
                    headers: { Authorization: `Bearer ${cookies.token}` }
                });
                const userDevices = userRes.data.devices || [];

                // 2. Fetch all devices' sensor data
                const sensorRes = await axios.get('/api/devices/all-sensor-data', {
                    headers: { Authorization: `Bearer ${cookies.token}` }
                });

                // 3. Filter for only assigned devices
                const assignedSensorData = {};
                (sensorRes.data.devices || []).forEach(dev => {
                    if (userDevices.includes(dev._id)) {
                        assignedSensorData[dev._id] = dev.data;
                    }
                });

                // 4. Generate alerts
                setAlerts(generateAlertsFromAllDevices(assignedSensorData));
            } catch (err) {
                setAlerts([]);
            }
            setLoading(false);
        }
        fetchUserDeviceAlerts();
    }, [cookies.token]);

    if (loading) return <div>Loading alerts...</div>;
    return (
        <div className="my-4">
            <h2 className="text-xl font-bold mb-2">My Device Alerts</h2>
            <AlertBellDropdown alerts={alerts} />
            {/* Or render as a list, if you don't want to use the bell dropdown */}
        </div>
    );
}