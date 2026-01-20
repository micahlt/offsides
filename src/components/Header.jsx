import React from 'react';
import { View } from 'react-native';
import { Button } from '@/reusables/ui/button';
import { Text } from '@/reusables/ui/text';
import { Icon } from '@/reusables/ui/icon';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { cn } from '@/lib/utils';

/**
 * @param {object} props
 * @param {string} [props.title] - Title text
 * @param {React.ReactNode} [props.titleComponent] - Custom title component (overrides title)
 * @param {React.ReactNode} [props.rightContent] - Content to render on the right side
 * @param {Function} [props.onBack] - Override back button action
 * @param {boolean} [props.showBack=true] - Whether to show the back button
 * @param {string} [props.className] - Additional classes
 */
function Header({
    title,
    titleComponent,
    rightContent,
    onBack,
    showBack = true,
    className = ""
}) {
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    return (
        <View className={cn("flex-row items-center justify-between pb-2 px-2 bg-secondary border-b border-border shadow-sm pt-safe", className)}>
            <View className="flex-row items-center gap-2 flex-1 bg-secondary">
                {showBack && (
                    <Button variant="ghost" size="icon" onPress={handleBack} className="h-10 w-10">
                        <Icon size={22} as={ArrowLeft} className="text-foreground" />
                    </Button>
                )}
                {titleComponent ? (
                    titleComponent
                ) : (
                    <Text className="text-xl font-semibold" numberOfLines={1}>
                        {title}
                    </Text>
                )}
            </View>

            <View className="flex-row items-center gap-1">
                {rightContent}
            </View>
        </View>
    );
}

export default Header;
