interface Location {
  latitude: number;
  longitude: number;
  timezone: string;
  city?: string;
  country?: string;
}

class LocationService {
  private currentLocation: Location | null = null;
  private readonly TIMEZONE_API_URL = 'https://maps.googleapis.com/maps/api/timezone/json';
  private readonly GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
  private readonly API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  async getCurrentLocation(): Promise<Location> {
    if (this.currentLocation) {
      return this.currentLocation;
    }

    try {
      // Get coordinates from browser
      const position = await this.getGeoLocation();
      
      // Get timezone and location details
      const [timezone, locationDetails] = await Promise.all([
        this.getTimezone(position.coords.latitude, position.coords.longitude),
        this.getLocationDetails(position.coords.latitude, position.coords.longitude)
      ]);

      this.currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timezone: timezone,
        ...locationDetails
      };

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting location:', error);
      // Fallback to system timezone
      return {
        latitude: 0,
        longitude: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  }

  private getGeoLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  }

  private async getTimezone(latitude: number, longitude: number): Promise<string> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const response = await fetch(
        `${this.TIMEZONE_API_URL}?location=${latitude},${longitude}&timestamp=${timestamp}&key=${this.API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch timezone');
      }

      const data = await response.json();
      return data.timeZoneId;
    } catch (error) {
      console.error('Error fetching timezone:', error);
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }

  private async getLocationDetails(latitude: number, longitude: number): Promise<{ city?: string; country?: string }> {
    try {
      const response = await fetch(
        `${this.GEOCODING_API_URL}?latlng=${latitude},${longitude}&key=${this.API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location details');
      }

      const data = await response.json();
      const addressComponents = data.results[0]?.address_components || [];
      
      return {
        city: addressComponents.find(c => c.types.includes('locality'))?.long_name,
        country: addressComponents.find(c => c.types.includes('country'))?.long_name
      };
    } catch (error) {
      console.error('Error fetching location details:', error);
      return {};
    }
  }

  // Helper method to format dates in local timezone
  formatDateToLocalTime(date: Date): string {
    return date.toLocaleString(undefined, {
      timeZone: this.currentLocation?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }
}

export const locationService = new LocationService(); 