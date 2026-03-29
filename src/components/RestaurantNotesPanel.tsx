import { useEffect, useMemo, useRef, useState } from 'react';
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
import { uiTheme } from '../constants/uiTheme';
import { useApp } from '../contexts/AppContext';
import type { RestaurantNote } from '../types';
import { BottomSheet } from './BottomSheet';
import { ConfirmSheet } from './ConfirmSheet';

const NOTE_MAX_CHARS = 400;
const NOTE_SUBJECTS = [
  'Floor',
  'VIP',
  'Event',
  '86 Item',
  'Urgent',
  'Table Opening',
] as const;

const SUBJECT_BADGE_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  Floor: { backgroundColor: '#e7f1fb', color: '#2e5c82' },
  VIP: { backgroundColor: '#f8ecff', color: '#7a3ea1' },
  Event: { backgroundColor: '#e9f8ef', color: '#2f7a4c' },
  '86 Item': { backgroundColor: '#fff1e8', color: '#a6541d' },
  Urgent: { backgroundColor: '#ffe9e9', color: '#b23a3a' },
  'Table Opening': { backgroundColor: '#eef3ff', color: '#415fb0' },
};

type RestaurantNotesPanelProps = {
  isOpen: boolean;
  panelWidth: number;
  notes: RestaurantNote[];
  onClose: () => void;
};

function formatRelativeTime(timestampMs: number) {
  const elapsedMs = Date.now() - timestampMs;
  if (elapsedMs < 60_000) return 'Just now';
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

function getReplyTargetId(note: RestaurantNote) {
  return note.parentId ?? note.id;
}

function getSubjectBadgeStyle(subject?: string | null) {
  if (!subject) return null;
  return SUBJECT_BADGE_STYLES[subject] ?? { backgroundColor: '#e6f0f8', color: '#35536c' };
}

function isChecklistLine(line: string) {
  return /^(?:\[(?:x| )\]|[○●])\s+/i.test(line.trim());
}

function parseNoteLines(text: string) {
  return text
    .split('\n')
    .map((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (isChecklistLine(trimmed)) {
        const checked = /^(?:\[x\]|●)\s+/i.test(trimmed);
        return {
          kind: 'checklist' as const,
          lineIndex,
          checked,
          text: trimmed.replace(/^(?:\[(?:x| )\]|[○●])\s+/i, ''),
        };
      }
      return {
        kind: 'text' as const,
        lineIndex,
        text: line,
      };
    })
    .filter((line): line is NonNullable<typeof line> => !!line);
}

function noteToDraft(note: RestaurantNote) {
  if (note.kind === 'checklist' && note.checklistItems?.length) {
    return note.checklistItems.map(item => `${item.checked ? '●' : '○'} ${item.text}`).join('\n');
  }
  return note.text;
}

export function RestaurantNotesPanel({
  isOpen,
  panelWidth,
  notes,
  onClose,
}: RestaurantNotesPanelProps) {
  const { createNote, updateNote, deleteNote, deleteAllNotes, toggleNotePinned } = useApp();
  const [draft, setDraft] = useState('');
  const [selectedNote, setSelectedNote] = useState<RestaurantNote | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const translateX = useRef(new Animated.Value(panelWidth + 24)).current;

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
      setSelectedNote(null);
      setEditingNoteId(null);
      setReplyParentId(null);
      setDraft('');
      setDraftSubject(null);
      setComposerOpen(false);
      setShowSubjectDropdown(false);
    }
  }, [isOpen]);

  const notesByParentId = useMemo(() => {
    const map = new Map<string | null, RestaurantNote[]>();
    notes.forEach(note => {
      const key = note.parentId ?? null;
      const current = map.get(key) ?? [];
      current.push(note);
      map.set(key, current);
    });
    map.forEach(group => {
      group.sort((a, b) => a.createdAtMs - b.createdAtMs);
    });
    return map;
  }, [notes]);

  const rootNotes = useMemo(() => {
    const roots = notes.filter(note => {
      if (!note.parentId) return true;
      return !notes.some(candidate => candidate.id === note.parentId);
    });
    return [...roots].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAtMs - a.updatedAtMs;
    });
  }, [notes]);

  const editingNote = editingNoteId ? notes.find(note => note.id === editingNoteId) ?? null : null;
  const replyTarget = replyParentId ? notes.find(note => note.id === replyParentId) ?? null : null;
  const submitLabel = editingNote ? 'Save' : replyTarget ? 'Reply' : 'Add Note';
  const canSubmit = draft.trim().length > 0;
  const noteActionTargetIsReply = !!selectedNote?.parentId;
  const isNarrowPanel = panelWidth < 420;

  const resetComposer = () => {
    setDraft('');
    setDraftSubject(null);
    setEditingNoteId(null);
    setReplyParentId(null);
    setComposerOpen(false);
    setShowSubjectDropdown(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const nextDraft = draft;
    const nextSubject = draftSubject;
    const nextEditingNoteId = editingNoteId;
    const nextReplyParentId = replyParentId;
    resetComposer();
    if (nextEditingNoteId) {
      await updateNote(nextEditingNoteId, nextDraft, nextSubject);
    } else {
      await createNote(nextDraft, nextReplyParentId, nextSubject);
    }
  };

  const handleEdit = () => {
    if (!selectedNote) return;
    setEditingNoteId(selectedNote.id);
    setReplyParentId(null);
    setDraft(noteToDraft(selectedNote));
    setDraftSubject(selectedNote.subject ?? null);
    setComposerOpen(true);
    setSelectedNote(null);
  };

  const handleReply = () => {
    if (!selectedNote) return;
    setReplyParentId(getReplyTargetId(selectedNote));
    setEditingNoteId(null);
    setDraft('');
    setDraftSubject(selectedNote.subject ?? null);
    setComposerOpen(true);
    setSelectedNote(null);
  };

  const handleTogglePin = async () => {
    if (!selectedNote) return;
    await toggleNotePinned(selectedNote.id);
    setSelectedNote(null);
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    await deleteNote(selectedNote.id);
    setSelectedNote(null);
  };

  const composerHint = editingNote
    ? 'Editing note'
    : replyTarget
      ? `Replying to: ${replyTarget.text}`
      : 'Create a note for the team';

  const insertChecklistLine = () => {
    setDraft(current => {
      const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
      const next = `${current}${prefix}○ `;
      return next.slice(0, NOTE_MAX_CHARS);
    });
  };

  const toggleInlineChecklistLine = async (note: RestaurantNote, lineIndex: number) => {
    const lines = noteToDraft(note).split('\n');
    const currentLine = lines[lineIndex];
    if (!currentLine || !isChecklistLine(currentLine)) return;
    lines[lineIndex] = /^(?:\[x\]|●)\s+/i.test(currentLine)
      ? currentLine.replace(/^(?:\[x\]|●)\s+/i, '○ ')
      : currentLine.replace(/^(?:\[\s\]|○)\s+/i, '● ');
    await updateNote(note.id, lines.join('\n'), note.subject ?? null);
  };

  return (
    <>
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
            <Text style={[styles.title, isNarrowPanel && styles.titleNarrow]}>Notes</Text>
            <Text style={[styles.subtitle, isNarrowPanel && styles.subtitleNarrow]}>
              Announcements, floor updates, and service notes
            </Text>
          </View>
          <View style={styles.headerActions}>
            {!composerOpen && (
              <TouchableOpacity
                onPress={() => {
                  setComposerOpen(true);
                  if (!editingNoteId && !replyParentId) {
                    setDraft('');
                    setDraftSubject(null);
                  }
                  setShowSubjectDropdown(false);
                }}
                style={[styles.iconButton, isNarrowPanel && styles.iconButtonNarrow]}
              >
                <Feather
                  name="edit-3"
                  size={isNarrowPanel ? 16 : 18}
                  color={uiTheme.colors.primaryStrong}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={[styles.iconButton, isNarrowPanel && styles.iconButtonNarrow]}>
              <Feather name="x" size={isNarrowPanel ? 18 : 20} color={uiTheme.colors.inkSoft} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.notesList}
          contentContainerStyle={[
            styles.notesListContent,
            isNarrowPanel && styles.notesListContentNarrow,
          ]}
        >
          {composerOpen && (
            <View style={[styles.composerCard, isNarrowPanel && styles.composerCardNarrow]}>
              <TextInput
                multiline
                value={draft}
                onChangeText={(value) => setDraft(value.slice(0, NOTE_MAX_CHARS))}
                placeholder="Add a note for the team"
                placeholderTextColor="#7a8894"
                style={[styles.input, isNarrowPanel && styles.inputNarrow]}
                textAlignVertical="top"
              />

              <View style={styles.composerFooter}>
                <View style={styles.composerFooterLeft}>
                  <Text style={styles.characterCount}>{draft.length}/{NOTE_MAX_CHARS}</Text>
                </View>
                <View style={styles.composerFooterActions}>
                  <TouchableOpacity
                    onPress={insertChecklistLine}
                    style={[styles.checklistInsertButton, isNarrowPanel && styles.checklistInsertButtonNarrow]}
                  >
                    <View style={styles.checklistInsertIcon}>
                      <View style={styles.checklistInsertDots}>
                        <View style={styles.checklistInsertDot} />
                        <View style={styles.checklistInsertDot} />
                      </View>
                      <View style={styles.checklistInsertLines}>
                        <View style={styles.checklistInsertLine} />
                        <View style={styles.checklistInsertLine} />
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={resetComposer} style={styles.cancelAction}>
                    <Text style={[styles.cancelActionText, isNarrowPanel && styles.footerActionTextNarrow]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      void handleSubmit();
                    }}
                    disabled={!canSubmit}
                    style={[
                      styles.submitButton,
                      isNarrowPanel && styles.submitButtonNarrow,
                      !canSubmit && styles.submitButtonDisabled,
                    ]}
                  >
                    <Text style={[styles.submitButtonText, isNarrowPanel && styles.footerActionTextNarrow]}>
                      {submitLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isNarrowPanel && styles.sectionTitleNarrow]}>Current Notes</Text>
              <Text style={[styles.sectionSubtitle, isNarrowPanel && styles.sectionSubtitleNarrow]}>
                Long press a note to edit, reply, pin, or delete.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowDeleteAllConfirm(true)} style={styles.clearAllNotesButton}>
              <Text style={[styles.clearAllNotesButtonText, isNarrowPanel && styles.clearAllNotesButtonTextNarrow]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>

          {rootNotes.length === 0 ? (
            <Text style={[styles.emptyStateInline, isNarrowPanel && styles.emptyStateInlineNarrow]}>No notes yet</Text>
          ) : (
            rootNotes.map(note => {
              const replies = notesByParentId.get(note.id) ?? [];
              const noteSubjectStyle = getSubjectBadgeStyle(note.subject);
              return (
                <View key={note.id} style={styles.threadBlock}>
                  <TouchableOpacity
                    onLongPress={() => setSelectedNote(note)}
                    delayLongPress={250}
                    activeOpacity={0.9}
                    style={[styles.noteCard, note.pinned && styles.noteCardPinned]}
                  >
                    {(!!note.subject || !!note.pinned) && (
                      <View style={styles.noteHeaderRow}>
                        {!!note.subject ? (
                          <Text
                            style={[
                              styles.subjectBadge,
                              noteSubjectStyle && {
                                backgroundColor: noteSubjectStyle.backgroundColor,
                                color: noteSubjectStyle.color,
                              },
                            ]}
                          >
                            {note.subject}
                          </Text>
                        ) : <View />}
                        {note.pinned && <Feather name="bookmark" size={14} color={uiTheme.colors.warning} />}
                      </View>
                    )}
                    <NoteBody
                      note={note}
                      onToggleChecklistLine={(lineIndex) => toggleInlineChecklistLine(note, lineIndex)}
                    />
                    <Text style={styles.noteMeta}>{formatRelativeTime(note.updatedAtMs)}</Text>
                  </TouchableOpacity>

                  {replies.map(reply => (
                    (() => {
                      const replySubjectStyle = getSubjectBadgeStyle(reply.subject);
                      return (
                    <TouchableOpacity
                      key={reply.id}
                      onLongPress={() => setSelectedNote(reply)}
                      delayLongPress={250}
                      activeOpacity={0.9}
                      style={styles.replyCard}
                    >
                      {!!reply.subject && (
                        <View style={styles.noteHeaderRow}>
                          <Text
                            style={[
                              styles.replySubjectBadge,
                              replySubjectStyle && {
                                backgroundColor: replySubjectStyle.backgroundColor,
                                color: replySubjectStyle.color,
                              },
                            ]}
                          >
                            {reply.subject}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.replyLabel}>Reply</Text>
                      <NoteBody
                        note={reply}
                        isReply
                        onToggleChecklistLine={(lineIndex) => toggleInlineChecklistLine(reply, lineIndex)}
                      />
                      <Text style={styles.noteMeta}>{formatRelativeTime(reply.updatedAtMs)}</Text>
                    </TouchableOpacity>
                      );
                    })()
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      <BottomSheet isOpen={!!selectedNote} onClose={() => setSelectedNote(null)}>
        <Text style={styles.sheetTitle}>Note Actions</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.sheetAction}>
          <Text style={styles.sheetActionText}>Edit</Text>
        </TouchableOpacity>
        {!noteActionTargetIsReply && (
          <TouchableOpacity onPress={() => { void handleTogglePin(); }} style={styles.sheetAction}>
            <Text style={styles.sheetActionText}>{selectedNote?.pinned ? 'Unpin' : 'Pin'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleReply} style={styles.sheetAction}>
          <Text style={styles.sheetActionText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { void handleDelete(); }} style={[styles.sheetAction, styles.sheetActionDanger]}>
          <Text style={styles.sheetActionDangerText}>Delete</Text>
        </TouchableOpacity>
      </BottomSheet>

      <ConfirmSheet
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={() => {
          void deleteAllNotes();
        }}
        title="Delete all notes?"
        message="This will permanently remove all active and expired notes for this restaurant."
        confirmLabel="Delete All"
      />
    </>
  );
}

function NoteBody({
  note,
  isReply = false,
  onToggleChecklistLine,
}: {
  note: RestaurantNote;
  isReply?: boolean;
  onToggleChecklistLine: (lineIndex: number) => void;
}) {
  const lines = parseNoteLines(noteToDraft(note));
  if (!lines.length) return null;

  return (
    <View style={styles.noteBody}>
      {lines.map(line =>
        line.kind === 'checklist' ? (
          <TouchableOpacity
            key={`${note.id}-line-${line.lineIndex}`}
            onPress={() => {
              void onToggleChecklistLine(line.lineIndex);
            }}
            style={styles.checklistRow}
          >
            <View style={[styles.checklistBox, line.checked && styles.checklistBoxChecked]}>
              {line.checked && <Feather name="check" size={13} color={uiTheme.colors.primaryStrong} />}
            </View>
            <Text style={[
              isReply ? styles.replyText : styles.noteText,
              styles.checklistText,
              line.checked && styles.checklistTextChecked,
            ]}>
              {line.text}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text
            key={`${note.id}-line-${line.lineIndex}`}
            style={isReply ? styles.replyText : styles.noteText}
          >
            {line.text}
          </Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: uiTheme.colors.appBackgroundAlt,
    zIndex: 20,
    borderLeftWidth: 1,
    borderLeftColor: uiTheme.colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.appBackgroundAlt,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  titleNarrow: {
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    marginTop: 6,
    maxWidth: 260,
    fontSize: 15,
    lineHeight: 22,
    color: uiTheme.colors.inkMuted,
  },
  subtitleNarrow: {
    maxWidth: '100%',
    fontSize: 12,
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTheme.colors.surface,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    ...uiTheme.shadow.soft,
  },
  iconButtonNarrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 14,
  },
  notesListContentNarrow: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  composerCard: {
    position: 'relative',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    padding: 16,
    ...uiTheme.shadow.card,
  },
  composerCardNarrow: {
    borderRadius: 16,
    padding: 12,
  },
  composerHint: {
    fontSize: 15,
    lineHeight: 22,
    color: uiTheme.colors.inkMuted,
    marginBottom: 10,
  },
  composerHintNarrow: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
    color: uiTheme.colors.ink,
  },
  inputNarrow: {
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  composerFooterLeft: {
    flexShrink: 1,
    minWidth: 0,
  },
  composerFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
    marginLeft: 'auto',
  },
  checklistInsertButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    ...uiTheme.shadow.soft,
  },
  checklistInsertButtonNarrow: {
    width: 24,
    height: 24,
    borderRadius: 7,
  },
  checklistInsertIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  checklistInsertDots: {
    gap: 3,
  },
  checklistInsertDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4DA3F5',
  },
  checklistInsertLines: {
    gap: 4,
  },
  checklistInsertLine: {
    width: 11,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#E9EDF2',
  },
  characterCount: {
    fontSize: 12,
    color: uiTheme.colors.inkMuted,
  },
  cancelAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTheme.colors.inkSoft,
  },
  footerActionTextNarrow: {
    fontSize: 12,
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: uiTheme.colors.primaryStrong,
    minHeight: 40,
    justifyContent: 'center',
    ...uiTheme.shadow.soft,
  },
  submitButtonNarrow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 34,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: uiTheme.colors.surfaceRaised,
  },
  sectionHeader: {
    gap: 6,
    paddingTop: 4,
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionTitleNarrow: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: uiTheme.colors.inkMuted,
  },
  sectionSubtitleNarrow: {
    fontSize: 12,
    lineHeight: 18,
  },
  clearAllNotesButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: uiTheme.radius.pill,
    borderWidth: 1,
    borderColor: uiTheme.colors.dangerBorder,
    backgroundColor: uiTheme.colors.dangerSurface,
  },
  clearAllNotesButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: uiTheme.colors.dangerText,
  },
  clearAllNotesButtonTextNarrow: {
    fontSize: 12,
  },
  emptyStateInline: {
    fontSize: 15,
    fontWeight: '600',
    color: uiTheme.colors.inkMuted,
    paddingTop: 2,
  },
  emptyStateInlineNarrow: {
    fontSize: 13,
  },
  threadBlock: {
    gap: 10,
  },
  noteBody: {
    gap: 8,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    padding: 16,
    ...uiTheme.shadow.soft,
  },
  noteCardPinned: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e6f0f8',
    fontSize: 11,
    fontWeight: '700',
    color: '#35536c',
  },
  noteText: {
    fontSize: 15,
    lineHeight: 24,
    color: uiTheme.colors.ink,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checklistBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: uiTheme.colors.borderStrong,
    backgroundColor: uiTheme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checklistBoxChecked: {
    borderColor: uiTheme.colors.primaryStrong,
    backgroundColor: uiTheme.colors.primarySurface,
  },
  checklistText: {
    flex: 1,
    marginTop: 0,
  },
  checklistTextChecked: {
    color: uiTheme.colors.inkSoft,
    textDecorationLine: 'line-through',
  },
  noteMeta: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
  },
  replyCard: {
    marginLeft: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: uiTheme.colors.surface,
    padding: 13,
    ...uiTheme.shadow.soft,
  },
  replySubjectBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#edf4fa',
    fontSize: 11,
    fontWeight: '700',
    color: '#4c667b',
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: uiTheme.colors.inkMuted,
    marginBottom: 6,
  },
  replyText: {
    fontSize: 14,
    lineHeight: 20,
    color: uiTheme.colors.ink,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: uiTheme.colors.ink,
    marginBottom: 14,
  },
  sheetAction: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: uiTheme.colors.border,
  },
  sheetActionDanger: {
    borderBottomWidth: 0,
  },
  sheetActionText: {
    fontSize: 16,
    color: uiTheme.colors.ink,
    fontWeight: '600',
  },
  sheetActionDangerText: {
    fontSize: 16,
    color: uiTheme.colors.dangerText,
    fontWeight: '700',
  },
});
