import { forwardRef } from "react";
import { RefreshControl, ScrollView, ScrollViewProps } from "react-native";
import { COLORS } from "@/constants/colors";

export type RefreshableScrollViewProps = ScrollViewProps & {
  refreshing: boolean;
  onRefresh: () => void;
  enabled?: boolean;
};

const RefreshableScrollView = forwardRef<ScrollView, RefreshableScrollViewProps>(function RefreshableScrollView({ refreshing, onRefresh, enabled = true, testID = "refreshable-scroll", ...props }, ref) {
  return (
    <ScrollView
      ref={ref}
      testID={testID}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      {...props}
      alwaysBounceVertical
      refreshControl={
        <RefreshControl enabled={enabled} refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.mainOrange]} tintColor={COLORS.mainOrange} />
      }
    />
  );
});

export default RefreshableScrollView;
