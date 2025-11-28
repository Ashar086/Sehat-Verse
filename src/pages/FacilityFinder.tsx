import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Phone, Clock, Star, Search, Info, ExternalLink } from 'lucide-react';
import { BackButton } from "@/components/BackButton";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDMP5YAWFZylxLf69fS_SY8yaPWOB6veYg';

interface Facility {
  id: string;
  name: string;
  address: string;
  type: string;
  rating: number;
  latitude: number;
  longitude: number;
  distance: string | null;
  duration: string | null;
  polyline: string | null;
  isOpen?: boolean;
  phone?: string | null;
  openingHours?: string[] | null;
  services?: string[] | null;
}

const FacilityFinder = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualAddress, setManualAddress] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalFacility, setModalFacility] = useState<Facility | null>(null);

  const mapContainerStyle = {
    width: '100%',
    height: '500px',
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          fetchFacilities(location.lat, location.lng);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location. Please enter manually.');
          setShowManualEntry(true);
          setLoading(false);
        }
      );
    } else {
      toast.error('Geolocation not supported');
      setShowManualEntry(true);
      setLoading(false);
    }
  };

  const fetchFacilities = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('facility-finder', {
        body: { latitude: lat, longitude: lng },
      });

      if (error) throw error;

      if (data?.success) {
        setFacilities(data.facilities);
        toast.success(`Found ${data.facilities.length} facilities nearby`);
      }
    } catch (error: any) {
      console.error('Error fetching facilities:', error);
      toast.error('Failed to fetch facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualAddress.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('facility-finder', {
        body: { address: manualAddress },
      });

      if (error) throw error;

      if (data?.success) {
        setUserLocation(data.userLocation);
        setFacilities(data.facilities);
        toast.success(`Found ${data.facilities.length} facilities nearby`);
        setShowManualEntry(false);
      }
    } catch (error: any) {
      console.error('Error searching by address:', error);
      toast.error('Failed to search by address');
    } finally {
      setLoading(false);
    }
  };

  const showRoute = async (facility: Facility) => {
    if (!userLocation) return;

    setSelectedFacility(facility);

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: { lat: facility.latitude, lng: facility.longitude },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
        }
      }
    );
  };

  const getFacilityIcon = (type: string) => {
    switch (type) {
      case 'hospital':
        return '🏥';
      case 'pharmacy':
        return '💊';
      case 'doctor':
        return '👨‍⚕️';
      default:
        return '🏥';
    }
  };

  const filteredFacilities = selectedType === 'all' 
    ? facilities 
    : facilities.filter(f => f.type === selectedType);

  const openDetailsModal = (facility: Facility) => {
    setModalFacility(facility);
    setDetailsModalOpen(true);
  };

  const openInGoogleMaps = (facility: Facility) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${facility.latitude},${facility.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <BackButton to="/dashboard" />
            <div>
              <h1 className="text-3xl font-bold">Healthcare Facility Finder</h1>
              <p className="text-muted-foreground">Find hospitals, clinics, and pharmacies within 3km</p>
            </div>
          </div>

          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Select Facility Type</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedType === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedType('all')}
                    className="flex items-center gap-2"
                  >
                    All Facilities
                  </Button>
                  <Button
                    variant={selectedType === 'hospital' ? 'default' : 'outline'}
                    onClick={() => setSelectedType('hospital')}
                    className="flex items-center gap-2"
                  >
                    🏥 Hospitals
                  </Button>
                  <Button
                    variant={selectedType === 'doctor' ? 'default' : 'outline'}
                    onClick={() => setSelectedType('doctor')}
                    className="flex items-center gap-2"
                  >
                    👨‍⚕️ Clinics
                  </Button>
                  <Button
                    variant={selectedType === 'pharmacy' ? 'default' : 'outline'}
                    onClick={() => setSelectedType('pharmacy')}
                    className="flex items-center gap-2"
                  >
                    💊 Pharmacies
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Location Options</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={getUserLocation}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    Use Live Location
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    className="flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Enter Location Manually
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {showManualEntry && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Enter Your Location</CardTitle>
              <CardDescription>Type your address to find nearby facilities</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Enter your address..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              />
              <Button onClick={handleManualSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Finding facilities near you...</p>
          </div>
        ) : (
          <>
            {userLocation && (
              <Card className="mb-6">
                <CardContent className="p-0">
                  <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={userLocation}
                      zoom={14}
                    >
                      <Marker
                        position={userLocation}
                        icon={{
                          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                        }}
                      />
                      {filteredFacilities.map((facility) => (
                        <Marker
                          key={facility.id}
                          position={{ lat: facility.latitude, lng: facility.longitude }}
                          onClick={() => showRoute(facility)}
                          label={{
                            text: getFacilityIcon(facility.type),
                            fontSize: '24px',
                          }}
                        />
                      ))}
                      {directions && <DirectionsRenderer directions={directions} />}
                    </GoogleMap>
                  </LoadScript>
                </CardContent>
              </Card>
            )}

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredFacilities.length} of {facilities.length} facilities
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFacilities.map((facility) => (
                <Card
                  key={facility.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedFacility?.id === facility.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => showRoute(facility)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getFacilityIcon(facility.type)}</span>
                        <div>
                          <CardTitle className="text-lg">{facility.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1 capitalize">
                            {facility.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{facility.address}</span>
                    </div>

                    {facility.rating > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>{facility.rating.toFixed(1)} / 5.0</span>
                      </div>
                    )}

                    {facility.distance && (
                      <div className="flex items-center gap-2 text-sm">
                        <Navigation className="h-4 w-4 text-muted-foreground" />
                        <span>{facility.distance}</span>
                        {facility.duration && <span className="text-muted-foreground">({facility.duration})</span>}
                      </div>
                    )}

                    {facility.isOpen !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={facility.isOpen ? 'text-green-600' : 'text-red-600'}>
                          {facility.isOpen ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          showRoute(facility);
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Route
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailsModal(facility);
                        }}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredFacilities.length === 0 && facilities.length > 0 && !loading && (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No {selectedType === 'all' ? 'facilities' : selectedType + 's'} found matching your filter</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSelectedType('all')}
                  >
                    Show All Facilities
                  </Button>
                </CardContent>
              </Card>
            )}

            {facilities.length === 0 && !loading && (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No facilities found within 3km radius</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowManualEntry(true)}
                  >
                    Try Different Location
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Facility Details Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-2xl">
            {modalFacility && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="text-2xl">{getFacilityIcon(modalFacility.type)}</span>
                    {modalFacility.name}
                  </DialogTitle>
                  <DialogDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4" />
                      {modalFacility.address}
                    </div>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Rating and Status */}
                  <div className="flex items-center gap-4">
                    {modalFacility.rating > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{modalFacility.rating.toFixed(1)} / 5.0</span>
                      </div>
                    )}
                    {modalFacility.isOpen !== undefined && (
                      <Badge variant={modalFacility.isOpen ? 'default' : 'secondary'}>
                        {modalFacility.isOpen ? 'Open Now' : 'Closed'}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Phone Number */}
                  {modalFacility.phone && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contact
                      </h4>
                      <div className="flex items-center gap-2">
                        <span>{modalFacility.phone}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`tel:${modalFacility.phone}`, '_self')}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Opening Hours */}
                  {modalFacility.openingHours && modalFacility.openingHours.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Opening Hours
                      </h4>
                      <div className="space-y-1 text-sm">
                        {modalFacility.openingHours.map((hours, idx) => (
                          <div key={idx} className="text-muted-foreground">{hours}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  {modalFacility.services && modalFacility.services.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {modalFacility.services.map((service, idx) => (
                          <Badge key={idx} variant="outline" className="capitalize">
                            {service.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Distance and Duration */}
                  {modalFacility.distance && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Navigation className="h-4 w-4" />
                        Distance
                      </h4>
                      <div className="text-sm">
                        <span className="font-medium">{modalFacility.distance}</span>
                        {modalFacility.duration && (
                          <span className="text-muted-foreground"> ({modalFacility.duration})</span>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Navigation Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => openInGoogleMaps(modalFacility)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get Turn-by-Turn Directions in Google Maps
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FacilityFinder;