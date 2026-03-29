import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { getTableDisplayLabel } from '../constants/tableLabels';
import { uiTheme } from '../constants/uiTheme';
import { useApp } from '../contexts/AppContext';
import type { TeamAssignment, TeamAssignmentShift } from '../types';
import { RestaurantTableSelector } from './RestaurantTableSelector';

const ROLE_OPTIONS = [
  'Lead',
  'Ring',
  'Beer',
  'Expo',
  'Runner/Busser',
  'Dining Zone 1',
  'Dining Zone 2',
  'Dining Zone 3',
  'Dining Zone 4',
  'Patio',
  'Event',
] as const;

const FLOOR_ROLES = new Set([
  'Dining Zone 1',
  'Dining Zone 2',
  'Dining Zone 3',
  'Dining Zone 4',
  'Patio',
  'Event',
  'Runner/Busser',
]);

const TIME_WHEEL_ITEM_HEIGHT = 44;
const TIME_WHEEL_LOOP_COPIES = 3;
const TIME_WHEEL_VISIBLE_ITEMS = 5;
const TIME_WHEEL_CENTER_PADDING = Math.floor(TIME_WHEEL_VISIBLE_ITEMS / 2) * TIME_WHEEL_ITEM_HEIGHT;
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour12 = Math.floor(index / 4) + 12;
  const normalizedHour = hour12 > 12 ? hour12 - 12 : hour12;
  const minute = (index % 4) * 15;
  return `${normalizedHour}:${minute.toString().padStart(2, '0')}`;
});
const OPEN_TIME_OPTIONS = TIME_OPTIONS;
const CLOSE_TIME_OPTIONS = [...TIME_OPTIONS.slice(0, 16), 'Close', 'BD', ...TIME_OPTIONS.slice(16)];
const OPEN_TIME_WHEEL_OPTIONS = Array.from({ length: TIME_WHEEL_LOOP_COPIES }, () => OPEN_TIME_OPTIONS).flat();
const CLOSE_TIME_WHEEL_OPTIONS = Array.from({ length: TIME_WHEEL_LOOP_COPIES }, () => CLOSE_TIME_OPTIONS).flat();
const TIME_PERIODS = ['AM', 'PM'] as const;
const TIME_OPTION_INDEX = new Map(TIME_OPTIONS.map((value, index) => [value, index]));
const SAVED_TEAM_MEMBERS_PREFIX = 'savedTeamMembers:v1:';

type TeamAssignmentsPanelProps = {
  isOpen: boolean;
  panelWidth: number;
  isManager: boolean;
  onClose: () => void;
};

function isFloorRole(role: string) {
  return FLOOR_ROLES.has(role);
}

function sortAssignments(assignments: TeamAssignment[]) {
  return [...assignments].sort((a, b) => {
    const parseSortValue = (value: string) => {
      const match = value.match(/^(\d{1,2}:\d{2})\s(AM|PM)$/);
      if (!match) return Number.MAX_SAFE_INTEGER;
      const baseIndex = TIME_OPTION_INDEX.get(match[1]) ?? Number.MAX_SAFE_INTEGER;
      if (baseIndex === Number.MAX_SAFE_INTEGER) return baseIndex;
      return baseIndex + (match[2] === 'PM' ? 48 : 0);
    };
    const aIndex = parseSortValue(a.inTime);
    const bIndex = parseSortValue(b.inTime);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.role.localeCompare(b.role);
  });
}

function normalizeTeamMemberName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseTimeMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];
  let hour24 = hour % 12;
  if (period === 'PM') hour24 += 12;
  return hour24 * 60 + minute;
}

function getShiftFromTime(value: string): TeamAssignmentShift {
  const minutes = parseTimeMinutes(value);
  if (minutes == null) return 'lunch';
  return minutes >= 16 * 60 ? 'dinner' : 'lunch';
}

function getBaseTimeOptions(field: 'in' | 'out') {
  return field === 'out' ? CLOSE_TIME_OPTIONS : OPEN_TIME_OPTIONS;
}

function getWheelTimeOptions(field: 'in' | 'out') {
  return field === 'out' ? CLOSE_TIME_WHEEL_OPTIONS : OPEN_TIME_WHEEL_OPTIONS;
}

export function TeamAssignmentsPanel({
  isOpen,
  panelWidth,
  isManager,
  onClose,
}: TeamAssignmentsPanelProps) {
  const { state, restaurantId, createTeamAssignment, updateTeamAssignment, deleteTeamAssignment } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState('');
  const [draftTeamMember, setDraftTeamMember] = useState('');
  const [draftInTime, setDraftInTime] = useState('');
  const [draftOutTime, setDraftOutTime] = useState('');
  const [draftAssignedTableIds, setDraftAssignedTableIds] = useState<string[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'in' | 'out' | null>(null);
  const [pickerTimeValue, setPickerTimeValue] = useState('10:00');
  const [pickerPeriod, setPickerPeriod] = useState<'AM' | 'PM'>('AM');
  const [savedTeamMembers, setSavedTeamMembers] = useState<string[]>([]);
  const translateX = useRef(new Animated.Value(panelWidth + 24)).current;
  const timeWheelRef = useRef<ScrollView | null>(null);
  const lastHapticValueRef = useRef<string | null>(null);
  const savedTeamMembersKey = `${SAVED_TEAM_MEMBERS_PREFIX}${restaurantId}`;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: isOpen ? 0 : panelWidth + 24,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [isOpen, panelWidth, translateX]);

  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setEditingAssignmentId(null);
      setDraftRole('');
      setDraftTeamMember('');
      setDraftInTime('');
      setDraftOutTime('');
      setDraftAssignedTableIds([]);
      setShowRoleDropdown(false);
      setShowTablePicker(false);
      setActiveTimeField(null);
      setPickerTimeValue('10:00');
      setPickerPeriod('AM');
      lastHapticValueRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    AsyncStorage.getItem(savedTeamMembersKey)
      .then(raw => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setSavedTeamMembers(parsed);
        }
      })
      .catch(() => undefined);
  }, [savedTeamMembersKey]);

  const orderedAssignments = useMemo(
    () => sortAssignments(state.teamAssignments),
    [state.teamAssignments]
  );

  const selectedTables = useMemo(
    () => [...state.tables]
      .filter(table => draftAssignedTableIds.includes(table.id))
      .sort((a, b) => a.tableNumber - b.tableNumber),
    [draftAssignedTableIds, state.tables]
  );
  const floorAssignmentCount = useMemo(
    () => orderedAssignments.filter(assignment => (assignment.assignedTableIds ?? []).length > 0).length,
    [orderedAssignments]
  );

  const resetForm = () => {
    setShowForm(false);
    setEditingAssignmentId(null);
    setDraftRole('');
    setDraftTeamMember('');
    setDraftInTime('');
    setDraftOutTime('');
    setDraftAssignedTableIds([]);
    setShowRoleDropdown(false);
    setShowTablePicker(false);
    setActiveTimeField(null);
    setPickerTimeValue('10:00');
    setPickerPeriod('AM');
  };

  const openCreateForm = () => {
    setEditingAssignmentId(null);
    setDraftRole('');
    setDraftTeamMember('');
    setDraftInTime('');
    setDraftOutTime('');
    setDraftAssignedTableIds([]);
    setShowRoleDropdown(false);
    setShowTablePicker(false);
    setActiveTimeField(null);
    setShowForm(true);
  };

  const openEditForm = (assignment: TeamAssignment) => {
    setEditingAssignmentId(assignment.id);
    setDraftRole(assignment.role);
    setDraftTeamMember(assignment.teamMember);
    setDraftInTime(assignment.inTime);
    setDraftOutTime(assignment.outTime);
    setDraftAssignedTableIds(assignment.assignedTableIds ?? []);
    setShowRoleDropdown(false);
    setShowTablePicker(false);
    setActiveTimeField(null);
    setShowForm(true);
  };

  const canSave =
    draftRole.trim().length > 0 &&
    draftTeamMember.trim().length > 0 &&
    draftInTime.trim().length > 0 &&
    draftOutTime.trim().length > 0;

  const openTimePicker = (field: 'in' | 'out') => {
    const currentValue = field === 'in' ? draftInTime : draftOutTime;
    if (field === 'out' && (currentValue === 'Close' || !currentValue)) {
      setPickerTimeValue('Close');
      setPickerPeriod('PM');
      setActiveTimeField(field);
      return;
    }
    const match = currentValue.match(/^(\d{1,2}:\d{2})\s(AM|PM)$/);
    setPickerTimeValue(match?.[1] && TIME_OPTION_INDEX.has(match[1]) ? match[1] : '10:00');
    setPickerPeriod(match?.[2] === 'PM' ? 'PM' : field === 'out' ? 'PM' : 'AM');
    setActiveTimeField(field);
  };

  const applyTimePicker = () => {
    if (!activeTimeField) return;
    const formatted = activeTimeField === 'out' && (pickerTimeValue === 'Close' || pickerTimeValue === 'BD')
      ? pickerTimeValue
      : `${pickerTimeValue} ${pickerPeriod}`;
    if (activeTimeField === 'in') {
      setDraftInTime(formatted);
    } else {
      setDraftOutTime(formatted);
    }
    setActiveTimeField(null);
  };

  useEffect(() => {
    if (!activeTimeField) return;
    const baseOptions = getBaseTimeOptions(activeTimeField);
    const selectedIndex = baseOptions.findIndex(time => time === pickerTimeValue);
    if (selectedIndex < 0) return;

    requestAnimationFrame(() => {
      timeWheelRef.current?.scrollTo({
        y: (selectedIndex + baseOptions.length) * TIME_WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    });
  }, [activeTimeField, pickerTimeValue]);

  const handleTimeWheelMomentumEnd = (offsetY: number) => {
    if (!activeTimeField) return;
    const baseOptions = getBaseTimeOptions(activeTimeField);
    const rawIndex = Math.round(offsetY / TIME_WHEEL_ITEM_HEIGHT);
    const normalizedIndex = ((rawIndex % baseOptions.length) + baseOptions.length) % baseOptions.length;
    const nextValue = baseOptions[normalizedIndex];
    setPickerTimeValue(nextValue);
    if (lastHapticValueRef.current !== nextValue) {
      lastHapticValueRef.current = nextValue;
      void Haptics.selectionAsync();
    }

    const centeredIndex = normalizedIndex + baseOptions.length;
    if (rawIndex !== centeredIndex) {
      requestAnimationFrame(() => {
        timeWheelRef.current?.scrollTo({
          y: centeredIndex * TIME_WHEEL_ITEM_HEIGHT,
          animated: false,
        });
      });
    }
  };

  const handleTimeWheelScrollEnd = (offsetY: number) => {
    handleTimeWheelMomentumEnd(offsetY);
  };

  const toggleDraftTable = (tableId: string) => {
    setDraftAssignedTableIds(current =>
      current.includes(tableId)
        ? current.filter(id => id !== tableId)
        : [...current, tableId]
    );
  };

  const handleSave = async () => {
    if (!canSave || !isManager) return;
    const normalizedTeamMember = normalizeTeamMemberName(draftTeamMember);

    const payload = {
      shift: getShiftFromTime(draftInTime),
      role: draftRole,
      teamMember: normalizedTeamMember,
      inTime: draftInTime,
      outTime: draftOutTime,
      assignedTableIds: isFloorRole(draftRole) ? draftAssignedTableIds : [],
    };

    const assignmentId = editingAssignmentId;
    resetForm();
    const nextSavedNames = savedTeamMembers.includes(normalizedTeamMember)
      ? savedTeamMembers
      : [...savedTeamMembers, normalizedTeamMember].sort((a, b) => a.localeCompare(b));
    setSavedTeamMembers(nextSavedNames);
    void AsyncStorage.setItem(savedTeamMembersKey, JSON.stringify(nextSavedNames));

    if (assignmentId) {
      await updateTeamAssignment(assignmentId, payload);
    } else {
      await createTeamAssignment(payload);
    }
  };

  const handleDeleteSavedTeamMember = (name: string) => {
    const nextSavedNames = savedTeamMembers.filter(savedName => savedName !== name);
    setSavedTeamMembers(nextSavedNames);
    void AsyncStorage.setItem(savedTeamMembersKey, JSON.stringify(nextSavedNames));
  };

  const renderAssignedTableSummary = (assignment: TeamAssignment) => {
    const assignedTables = [...state.tables]
      .filter(table => (assignment.assignedTableIds ?? []).includes(table.id))
      .sort((a, b) => a.tableNumber - b.tableNumber);

    if (assignedTables.length === 0) return null;

    return (
      <View style={styles.coverageBlock}>
        <Text style={styles.coverageLabel}>Assigned Tables</Text>
        <View style={styles.tableChipRow}>
          {assignedTables.map(table => (
            <View key={table.id} style={styles.tableChip}>
              <Text style={styles.tableChipText}>
                {getTableDisplayLabel(restaurantId, table.tableNumber)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      {isOpen && <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop} />}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.panel,
          {
            width: panelWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Team</Text>
            <Text style={styles.subtitle}>{isManager ? 'Manager editing enabled' : 'View only'}</Text>
          </View>
          <View style={styles.headerActions}>
            {isManager && (
              <TouchableOpacity onPress={openCreateForm} style={styles.iconButton}>
                <Feather name="plus" size={18} color={uiTheme.colors.primaryStrong} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Feather name="x" size={20} color={uiTheme.colors.primaryStrong} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{orderedAssignments.length}</Text>
            <Text style={styles.metricLabel}>Assignments</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{floorAssignmentCount}</Text>
            <Text style={styles.metricLabel}>Floor Coverage</Text>
          </View>
        </View>

        <ScrollView style={styles.assignmentList} contentContainerStyle={styles.assignmentListContent}>
          {showForm && isManager && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{editingAssignmentId ? 'Edit Assignment' : 'New Assignment'}</Text>

              <TouchableOpacity
                onPress={() => setShowRoleDropdown(current => !current)}
                style={styles.roleTrigger}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.inputLabel}>Role</Text>
                  <Text style={[styles.roleValue, !draftRole && styles.placeholderText]}>
                    {draftRole || 'Select role'}
                  </Text>
                </View>
                <Feather name={showRoleDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={uiTheme.colors.inkSoft} />
              </TouchableOpacity>

              {showRoleDropdown && (
                <View style={styles.roleDropdown}>
                  {ROLE_OPTIONS.map(role => (
                    <TouchableOpacity
                      key={role}
                      onPress={() => {
                        setDraftRole(role);
                        if (!isFloorRole(role)) {
                          setDraftAssignedTableIds([]);
                          setShowTablePicker(false);
                        }
                        setShowRoleDropdown(false);
                      }}
                      style={styles.roleOption}
                    >
                      <Text style={styles.roleOptionText}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Team Member</Text>
                <TextInput
                  value={draftTeamMember}
                  onChangeText={value => setDraftTeamMember(normalizeTeamMemberName(value))}
                  placeholder="Name"
                  placeholderTextColor="#8193a3"
                  style={styles.textInput}
                />
              </View>

              {savedTeamMembers.length > 0 && (
                <View style={styles.savedNamesBlock}>
                  <Text style={styles.inputLabel}>Saved Names</Text>
                  <View style={styles.tableChipRow}>
                    {savedTeamMembers.map(name => (
                      <TouchableOpacity
                        key={name}
                        onPress={() => setDraftTeamMember(name)}
                        onLongPress={() => handleDeleteSavedTeamMember(name)}
                        delayLongPress={350}
                        style={styles.savedNameChip}
                      >
                        <Text style={styles.tableChipText}>{name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, styles.timeField]}>
                  <Text style={styles.inputLabel}>In</Text>
                  <TouchableOpacity
                    onPress={() => openTimePicker('in')}
                    style={styles.timePickerTrigger}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.timePickerValue, !draftInTime && styles.placeholderText]}>
                      {draftInTime || 'Select time'}
                    </Text>
                    <Feather name="chevron-down" size={18} color={uiTheme.colors.inkSoft} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, styles.timeField]}>
                  <Text style={styles.inputLabel}>Out</Text>
                  <TouchableOpacity
                    onPress={() => openTimePicker('out')}
                    style={styles.timePickerTrigger}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.timePickerValue, !draftOutTime && styles.placeholderText]}>
                      {draftOutTime || 'Select time'}
                    </Text>
                    <Feather name="chevron-down" size={18} color={uiTheme.colors.inkSoft} />
                  </TouchableOpacity>
                </View>
              </View>

              {activeTimeField && (
                <View style={styles.timePickerCard}>
                  <Text style={styles.timePickerTitle}>
                    {activeTimeField === 'in' ? 'Select In Time' : 'Select Out Time'}
                  </Text>
                  <View style={styles.timeWheelRow}>
                    <ScrollView
                      ref={timeWheelRef}
                      style={styles.timeWheel}
                      contentContainerStyle={styles.timeWheelContent}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
                      snapToAlignment="center"
                      disableIntervalMomentum
                      decelerationRate="fast"
                      onScrollEndDrag={(event) => {
                        if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.05) {
                          handleTimeWheelScrollEnd(event.nativeEvent.contentOffset.y);
                        }
                      }}
                      onMomentumScrollEnd={(event) => {
                        handleTimeWheelScrollEnd(event.nativeEvent.contentOffset.y);
                      }}
                    >
                      {getWheelTimeOptions(activeTimeField).map((time, index) => (
                        <TouchableOpacity
                          key={`${time}-${index}`}
                          onPress={() => setPickerTimeValue(time)}
                          style={[
                            styles.timeWheelItem,
                            pickerTimeValue === time && styles.timeWheelItemActive,
                          ]}
                        >
                          <Text style={[styles.timeWheelText, pickerTimeValue === time && styles.timeWheelTextActive]}>
                            {time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View pointerEvents="none" style={styles.timeWheelCenterOverlay} />
                    <View pointerEvents="none" style={styles.timeWheelFadeTop} />
                    <View pointerEvents="none" style={styles.timeWheelFadeBottom} />
                    <View style={styles.periodWheel}>
                      {TIME_PERIODS.map(period => (
                        <TouchableOpacity
                          key={period}
                          onPress={() => setPickerPeriod(period)}
                          style={[
                            styles.timeWheelItem,
                            pickerPeriod === period && styles.timeWheelItemActive,
                          ]}
                        >
                          <Text style={[styles.timeWheelText, pickerPeriod === period && styles.timeWheelTextActive]}>
                            {period}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.timePickerActions}>
                    <TouchableOpacity onPress={() => setActiveTimeField(null)} style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={applyTimePicker} style={styles.saveButton}>
                      <Text style={styles.saveButtonText}>Set Time</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isFloorRole(draftRole) && (
                <View style={styles.assignedTablesBlock}>
                  <TouchableOpacity
                    onPress={() => setShowTablePicker(current => !current)}
                    style={styles.roleTrigger}
                    activeOpacity={0.85}
                  >
                    <View style={styles.assignedTablesTextWrap}>
                      <View style={styles.optionalLabelRow}>
                        <Text style={styles.inputLabelInline}>Floor Assignment</Text>
                        <Text style={styles.optionalLabel}>(Optional)</Text>
                      </View>
                    </View>
                    <View style={styles.assignedTablesValueWrap}>
                      {selectedTables.length > 0 && (
                        <Text style={styles.roleValue}>{`${selectedTables.length} selected`}</Text>
                      )}
                    </View>
                    <Feather name={showTablePicker ? 'chevron-up' : 'chevron-down'} size={18} color={uiTheme.colors.inkSoft} />
                  </TouchableOpacity>

                  {selectedTables.length > 0 && (
                    <View style={styles.tableChipRow}>
                      {selectedTables.map(table => (
                        <View key={table.id} style={styles.tableChip}>
                          <Text style={styles.tableChipText}>
                            {getTableDisplayLabel(restaurantId, table.tableNumber)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {showTablePicker && (
                    <View style={styles.tablePickerCard}>
                      <Text style={styles.tablePickerTitle}>Tap tables to assign coverage</Text>
                      <RestaurantTableSelector
                        restaurantId={restaurantId}
                        tables={state.tables}
                        selectedTableIds={draftAssignedTableIds}
                        onToggleTable={toggleDraftTable}
                      />
                    </View>
                  )}
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity onPress={resetForm} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    void handleSave();
                  }}
                  disabled={!canSave}
                  style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                >
                  <Text style={styles.saveButtonText}>{editingAssignmentId ? 'Save' : 'Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.assignmentSection}>
            {orderedAssignments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No assignments yet</Text>
              </View>
            ) : (
              orderedAssignments.map(assignment => (
                <View key={assignment.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    <Text style={styles.assignmentRole}>{assignment.role}</Text>
                    {isManager && (
                      <View style={styles.assignmentActions}>
                        <TouchableOpacity onPress={() => openEditForm(assignment)} style={styles.assignmentActionButton}>
                          <Feather name="edit-2" size={14} color={uiTheme.colors.inkSoft} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            void deleteTeamAssignment(assignment.id);
                          }}
                          style={styles.assignmentActionButton}
                        >
                          <Feather name="trash-2" size={14} color={uiTheme.colors.dangerText} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Text style={styles.assignmentMember}>{assignment.teamMember}</Text>
                  <View style={styles.assignmentTimeRow}>
                    <View style={styles.assignmentTimeBlock}>
                      <Text style={styles.assignmentTimeHeading}>In</Text>
                      <Text style={styles.assignmentTimeLabel}>{assignment.inTime}</Text>
                    </View>
                    <View style={styles.assignmentTimeBlock}>
                      <Text style={styles.assignmentTimeHeading}>Out</Text>
                      <Text style={styles.assignmentTimeLabel}>{assignment.outTime}</Text>
                    </View>
                  </View>
                  {renderAssignedTableSummary(assignment)}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(17, 34, 51, 0.12)',
    zIndex: 19,
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: uiTheme.colors.surfaceMuted,
    zIndex: 20,
    borderLeftWidth: 1,
    borderLeftColor: uiTheme.colors.border,
    ...uiTheme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.appBackgroundAlt,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: uiTheme.colors.inkSoft,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    ...uiTheme.shadow.soft,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...uiTheme.shadow.soft,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: uiTheme.colors.primaryStrong,
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: uiTheme.colors.inkMuted,
  },
  assignmentList: {
    flex: 1,
  },
  assignmentListContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    padding: 14,
    ...uiTheme.shadow.soft,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: uiTheme.colors.inkMuted,
    marginBottom: 6,
  },
  inputLabelInline: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: uiTheme.colors.inkMuted,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    paddingHorizontal: 12,
    fontSize: 15,
    color: uiTheme.colors.ink,
  },
  timePickerTrigger: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerValue: {
    fontSize: 15,
    color: uiTheme.colors.ink,
    fontWeight: '600',
  },
  roleTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  roleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTheme.colors.ink,
  },
  placeholderText: {
    color: uiTheme.colors.inkMuted,
    fontWeight: '500',
  },
  roleDropdown: {
    marginTop: -2,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    overflow: 'hidden',
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: uiTheme.colors.border,
  },
  roleOptionText: {
    fontSize: 14,
    color: uiTheme.colors.ink,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeField: {
    flex: 1,
  },
  timePickerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceMuted,
    padding: 12,
    marginBottom: 10,
  },
  timePickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 10,
  },
  timeWheel: {
    flex: 1,
    maxHeight: TIME_WHEEL_ITEM_HEIGHT * 5,
    borderRadius: 12,
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
  },
  timeWheelContent: {
    paddingVertical: TIME_WHEEL_CENTER_PADDING,
  },
  timeWheelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  periodWheel: {
    width: 96,
    borderRadius: 12,
    backgroundColor: uiTheme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    justifyContent: 'center',
  },
  timeWheelItem: {
    height: TIME_WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeWheelItemActive: {
    backgroundColor: uiTheme.colors.primarySurface,
  },
  timeWheelText: {
    fontSize: 17,
    color: uiTheme.colors.inkSoft,
    fontWeight: '500',
  },
  timeWheelTextActive: {
    color: uiTheme.colors.ink,
    fontWeight: '700',
  },
  timeWheelCenterOverlay: {
    position: 'absolute',
    left: 0,
    right: 106,
    top: TIME_WHEEL_CENTER_PADDING,
    height: TIME_WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: 'rgba(217, 233, 242, 0.6)',
  },
  timeWheelFadeTop: {
    position: 'absolute',
    left: 0,
    right: 106,
    top: 0,
    height: TIME_WHEEL_CENTER_PADDING,
    backgroundColor: 'rgba(247, 242, 232, 0.84)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  timeWheelFadeBottom: {
    position: 'absolute',
    left: 0,
    right: 106,
    bottom: 0,
    height: TIME_WHEEL_CENTER_PADDING,
    backgroundColor: 'rgba(247, 242, 232, 0.84)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  assignedTablesBlock: {
    marginBottom: 4,
  },
  savedNamesBlock: {
    marginBottom: 10,
  },
  savedNameChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  assignedTablesTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  optionalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignedTablesValueWrap: {
    flex: 1,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: uiTheme.colors.inkMuted,
  },
  tablePickerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceMuted,
    padding: 12,
    marginBottom: 10,
  },
  tablePickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 10,
  },
  tableChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tableChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: uiTheme.colors.primaryStrong,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: uiTheme.colors.inkSoft,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: uiTheme.radius.md,
    backgroundColor: uiTheme.colors.primaryStrong,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    padding: 18,
    ...uiTheme.shadow.soft,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: uiTheme.colors.ink,
  },
  assignmentSection: {
    gap: 12,
  },
  assignmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surfaceRaised,
    padding: 14,
    ...uiTheme.shadow.soft,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  assignmentRole: {
    fontSize: 14,
    fontWeight: '700',
    color: uiTheme.colors.primaryStrong,
  },
  assignmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentActionButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTheme.colors.surfaceMuted,
  },
  assignmentMember: {
    fontSize: 18,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 8,
  },
  assignmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  assignmentTimeBlock: {
    gap: 2,
  },
  assignmentTimeHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: uiTheme.colors.inkMuted,
  },
  assignmentTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTheme.colors.inkSoft,
  },
  coverageBlock: {
    marginTop: 10,
  },
  coverageLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: uiTheme.colors.inkMuted,
    marginBottom: 8,
  },
});
