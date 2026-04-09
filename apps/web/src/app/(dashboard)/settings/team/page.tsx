"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreVertical,
  Plus,
  Shield,
  UserMinus,
  Users,
  Loader2,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth, useOrganization, useAuthContext } from "@/lib/auth";

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    lastLoginAt: string | null;
    isActive: boolean;
  };
}

type OrgRole = "ADMIN" | "MEMBER" | "VIEWER";

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  OWNER: { label: "Owner", variant: "default" },
  ADMIN: { label: "Admin", variant: "secondary" },
  MEMBER: { label: "Member", variant: "outline" },
  VIEWER: { label: "Viewer", variant: "outline" },
};

function SelfhostedTeamPage() {
  const { getToken, userId } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<OrgRole>("MEMBER");
  const [generatePw, setGeneratePw] = useState(true);
  const [customPassword, setCustomPassword] = useState("");

  // Result state - show generated password
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/auth/team/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleCreate = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch("/auth/team/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          role,
          password: generatePw ? undefined : customPassword || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add member");
      }

      const result = await res.json();

      if (result.generatedPassword) {
        setCreatedUser({ email, password: result.generatedPassword });
      } else {
        toast.success(`${email} added to team`);
        setIsDialogOpen(false);
        resetForm();
      }

      fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (targetUserId: string) => {
    setRemovingId(targetUserId);
    try {
      const token = await getToken();
      const res = await fetch(`/auth/team/members/${targetUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove member");
      }
      toast.success("Member removed");
      fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    setChangingRoleId(targetUserId);
    try {
      const token = await getToken();
      const res = await fetch(`/auth/team/members/${targetUserId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to change role");
      }
      toast.success("Role updated");
      fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change role");
    } finally {
      setChangingRoleId(null);
    }
  };

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRole("MEMBER");
    setGeneratePw(true);
    setCustomPassword("");
    setCreatedUser(null);
    setCopied(false);
  };

  const handleCopyCredentials = () => {
    if (!createdUser) return;
    navigator.clipboard.writeText(`Email: ${createdUser.email}\nPassword: ${createdUser.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsDialogOpen(open);
  };

  const getInitials = (member: TeamMember) => {
    const f = member.user.firstName?.[0] || "";
    const l = member.user.lastName?.[0] || "";
    return (f + l).toUpperCase() || member.user.email[0].toUpperCase();
  };

  const getName = (member: TeamMember) => {
    if (member.user.firstName || member.user.lastName) {
      return [member.user.firstName, member.user.lastName].filter(Boolean).join(" ");
    }
    return member.user.email.split("@")[0];
  };

  const currentUserRole = members.find((m) => m.userId === userId)?.role;
  const isAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Team</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage team members and their permissions
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm" className="sm:h-10">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              {createdUser ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Member Created</DialogTitle>
                    <DialogDescription>
                      Share these credentials with the new team member. The password won&apos;t be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogBody className="space-y-4 py-4">
                    <div className="rounded-md border bg-muted/50 p-4 space-y-2 font-mono text-sm">
                      <div><span className="text-muted-foreground">Email:</span> {createdUser.email}</div>
                      <div><span className="text-muted-foreground">Password:</span> {createdUser.password}</div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The user will be asked to change their password on first login.
                    </p>
                  </DialogBody>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCopyCredentials}>
                      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copied ? "Copied" : "Copy Credentials"}
                    </Button>
                    <Button onClick={() => handleDialogClose(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Create an account and add them to your organization
                    </DialogDescription>
                  </DialogHeader>
                  <DialogBody className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Admins can manage team members and settings
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="generatePw"
                          checked={generatePw}
                          onCheckedChange={(c) => setGeneratePw(c === true)}
                        />
                        <Label htmlFor="generatePw" className="font-normal text-sm cursor-pointer">
                          Generate password automatically
                        </Label>
                      </div>
                      {!generatePw && (
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Min 8 characters"
                            value={customPassword}
                            onChange={(e) => setCustomPassword(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </DialogBody>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleDialogClose(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!email.trim() || isSubmitting || (!generatePw && customPassword.length < 8)}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4 mr-2" />
                      )}
                      Create Account
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>Members</span>
          <span className="font-semibold text-foreground">{members.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4" />
          <span>Admins</span>
          <span className="font-semibold text-foreground">
            {members.filter((m) => m.role === "OWNER" || m.role === "ADMIN").length}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const name = getName(member);
                const isCurrentUser = member.userId === userId;
                const config = roleLabels[member.role] || roleLabels.MEMBER;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.imageUrl || undefined} />
                          <AvatarFallback>{getInitials(member)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(member.joinedAt))}
                    </TableCell>
                    <TableCell>
                      {isAdmin && !isCurrentUser && member.role !== "OWNER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={removingId === member.userId || changingRoleId === member.userId}
                            >
                              {removingId === member.userId || changingRoleId === member.userId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeRole(
                                  member.userId,
                                  member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                )
                              }
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {member.role === "ADMIN" ? "Remove Admin" : "Make Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setConfirmRemove({ userId: member.userId, name })}
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {confirmRemove?.name} from this organization?
              They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && handleRemove(confirmRemove.userId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Clerk mode version - full team management (kept for Clerk mode)
function ClerkModeTeamPage() {
  const { organization, membership, memberships, invitations, isLoaded } =
    useOrganization({
      memberships: { infinite: true },
      invitations: { infinite: true },
    });

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"org:admin" | "org:member">("org:member");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!organization || !("inviteMember" in organization)) return;
    setIsInviting(true);
    try {
      await (organization as any).inviteMember({ emailAddress: inviteEmail, role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteOpen(false);
      setInviteEmail("");
      if (invitations?.revalidate) await invitations.revalidate();
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const membersList = memberships?.data || [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage team members</p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Invite</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4">
              <Input placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org:admin">Admin</SelectItem>
                  <SelectItem value="org:member">Member</SelectItem>
                </SelectContent>
              </Select>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!inviteEmail || isInviting}>
                {isInviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersList.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>{member.publicUserData?.identifier || "Unknown"}</TableCell>
                  <TableCell><Badge variant="outline">{member.role}</Badge></TableCell>
                  <TableCell>{member.createdAt ? formatDistanceToNow(new Date(member.createdAt)) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamPage() {
  const { isSelfhostedMode } = useAuthContext();

  if (isSelfhostedMode) {
    return <SelfhostedTeamPage />;
  }

  return <ClerkModeTeamPage />;
}
