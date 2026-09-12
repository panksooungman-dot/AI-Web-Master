import {
  BrandSection,
  FinalCTASection,
  FoodSection,
  HeroSection,
  LocalSection,
  LocationTeaserSection,
  OccasionTeaserSection,
  ReviewTeaserSection,
  SignatureMenuSection,
  SoulSection,
  SpaceTeaserSection,
  TourSection,
} from "@/components/sections/HomeSections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BrandSection />
      <SignatureMenuSection />
      <FoodSection />
      <SoulSection />
      <SpaceTeaserSection />
      <OccasionTeaserSection />
      <LocalSection />
      <TourSection />
      <ReviewTeaserSection />
      <LocationTeaserSection />
      <FinalCTASection />
    </>
  );
}
