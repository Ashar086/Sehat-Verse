import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, address } = await req.json();
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    let lat = latitude;
    let lng = longitude;

    // If address provided, geocode it first
    if (address && !lat && !lng) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.status === 'OK' && geocodeData.results[0]) {
        lat = geocodeData.results[0].geometry.location.lat;
        lng = geocodeData.results[0].geometry.location.lng;
      } else {
        throw new Error('Could not geocode address');
      }
    }

    if (!lat || !lng) {
      throw new Error('Location coordinates required');
    }

    // Search for healthcare facilities within 3km
    const facilityTypes = ['hospital', 'pharmacy', 'doctor', 'health'];
    const allFacilities = [];

    for (const type of facilityTypes) {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
      const placesResponse = await fetch(placesUrl);
      const placesData = await placesResponse.json();

      if (placesData.status === 'OK' && placesData.results) {
        for (const place of placesData.results) {
          // Get distance and duration using Directions API
          const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lng}&destination=${place.geometry.location.lat},${place.geometry.location.lng}&key=${GOOGLE_MAPS_API_KEY}`;
          const directionsResponse = await fetch(directionsUrl);
          const directionsData = await directionsResponse.json();

          let distance = null;
          let duration = null;
          let polyline = null;

          if (directionsData.status === 'OK' && directionsData.routes[0]) {
            const leg = directionsData.routes[0].legs[0];
            distance = leg.distance.text;
            duration = leg.duration.text;
            polyline = directionsData.routes[0].overview_polyline.points;
          }

          // Get place details for phone and hours
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,opening_hours,types&key=${GOOGLE_MAPS_API_KEY}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          let phone = null;
          let openingHours = null;
          let services = [];
          
          if (detailsData.status === 'OK' && detailsData.result) {
            phone = detailsData.result.formatted_phone_number;
            openingHours = detailsData.result.opening_hours?.weekday_text;
            services = detailsData.result.types?.filter((t: string) => 
              !['point_of_interest', 'establishment'].includes(t)
            ) || [];
          }

          allFacilities.push({
            id: place.place_id,
            name: place.name,
            address: place.vicinity,
            type: type,
            rating: place.rating || 0,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            distance,
            duration,
            polyline,
            isOpen: place.opening_hours?.open_now,
            phone,
            openingHours,
            services,
          });
        }
      }
    }

    // Sort by distance (extract numeric value from distance string)
    allFacilities.sort((a, b) => {
      const getDistanceValue = (dist: string | null) => {
        if (!dist) return 999999;
        const match = dist.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : 999999;
      };
      return getDistanceValue(a.distance) - getDistanceValue(b.distance);
    });

    console.log(`Found ${allFacilities.length} facilities within 3km`);

    return new Response(JSON.stringify({
      success: true,
      facilities: allFacilities,
      userLocation: { lat, lng },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Facility finder error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        facilities: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
